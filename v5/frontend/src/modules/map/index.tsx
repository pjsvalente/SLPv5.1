import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '@/services/api'
import {
  MapPin, Navigation, Filter, Layers, RefreshCw, Route as RouteIcon,
  AlertCircle, CheckCircle, Wrench, Eye, Plus, X, Play, List, Crosshair
} from 'lucide-react'

// Fix Leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

// Custom marker icons by status
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

const statusColors: Record<string, string> = {
  'Operacional': '#22c55e',
  'Manutencao Necessaria': '#eab308',
  'Em Reparacao': '#f97316',
  'Desativado': '#ef4444',
}

const interventionTypeColors: Record<string, string> = {
  'preventiva': '#3b82f6',
  'corretiva': '#ef4444',
  'substituicao': '#8b5cf6',
  'inspecao': '#22c55e',
}

interface MapAsset {
  id: number
  serial_number: string
  latitude: number
  longitude: number
  status: string
  municipality: string
  street_address: string
  model: string
  manufacturer: string
}

interface MapIntervention {
  id: number
  intervention_type: string
  status: string
  asset_serial: string
  latitude: number
  longitude: number
  street_address: string
  municipality: string
  problem_description: string
  created_at: string
  created_by_name: string
}

interface RouteWaypoint {
  id: number | string
  type: string
  latitude: number
  longitude: number
  label: string
  sequence?: number
  intervention_type?: string
}

interface RouteGeometry {
  type: string
  coordinates: [number, number][]  // GeoJSON format: [lng, lat]
}

// Component to fit map bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [positions, map])

  return null
}

// Component to capture map clicks for starting point
function MapClickHandler({ active, onMapClick }: { active: boolean; onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (active) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return null
}

// Starting point marker icon
const startingPointIcon = L.divIcon({
  className: 'starting-point-marker',
  html: `<div style="
    background-color: #10b981;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Main Map View Component
function MapView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [assets, setAssets] = useState<MapAsset[]>([])
  const [interventions, setInterventions] = useState<MapIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAssets, setShowAssets] = useState(true)
  const [showInterventions, setShowInterventions] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [municipalityFilter, setMunicipalityFilter] = useState('')
  const [municipalities, setMunicipalities] = useState<string[]>([])
  const [statistics, setStatistics] = useState<any>(null)

  // Route planning state
  const [routePlanningMode, setRoutePlanningMode] = useState(false)
  const [selectedInterventions, setSelectedInterventions] = useState<number[]>([])
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([])
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null)
  const [routeStats, setRouteStats] = useState<{ distance: number; time: number } | null>(null)
  const [startingPoint, setStartingPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [selectingStartPoint, setSelectingStartPoint] = useState(false)

  // Default center (Portugal)
  const defaultCenter: [number, number] = [39.5, -8.0]
  const defaultZoom = 7

  useEffect(() => {
    loadData()
  }, [statusFilter, municipalityFilter])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      // Load assets
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (municipalityFilter) params.append('municipality', municipalityFilter)

      const [assetsData, interventionsData, statsData] = await Promise.all([
        api.get(`/map/assets?${params}`),
        api.get('/map/interventions?status=em_curso'),
        api.get('/map/statistics')
      ])

      setAssets(assetsData.assets || [])
      setInterventions(interventionsData.interventions || [])
      setStatistics(statsData)

      // Extract unique municipalities
      const munis = [...new Set(assetsData.assets?.map((a: MapAsset) => a.municipality).filter(Boolean))]
      setMunicipalities(munis as string[])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do mapa')
    } finally {
      setLoading(false)
    }
  }

  const toggleInterventionSelection = (id: number) => {
    setSelectedInterventions(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const calculateRoute = async () => {
    if (selectedInterventions.length === 0) return

    try {
      const requestBody: any = {
        intervention_ids: selectedInterventions
      }

      // Include starting point if defined
      if (startingPoint) {
        requestBody.starting_point = {
          latitude: startingPoint.lat,
          longitude: startingPoint.lng
        }
      }

      const result = await api.post('/map/route-plan', requestBody)

      setRouteWaypoints(result.waypoints || [])
      setRouteGeometry(result.route_geometry || null)
      setRouteStats({
        distance: result.total_distance_km,
        time: result.estimated_time_minutes
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao calcular rota')
    }
  }

  const clearRoute = () => {
    setSelectedInterventions([])
    setRouteWaypoints([])
    setRouteGeometry(null)
    setRouteStats(null)
    setRoutePlanningMode(false)
    setStartingPoint(null)
    setSelectingStartPoint(false)
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (selectingStartPoint) {
      setStartingPoint({ lat, lng })
      setSelectingStartPoint(false)
    }
  }

  // Get all marker positions for bounds
  const allPositions: [number, number][] = [
    ...(showAssets ? assets.map(a => [a.latitude, a.longitude] as [number, number]) : []),
    ...(showInterventions ? interventions.map(i => [i.latitude, i.longitude] as [number, number]) : [])
  ]

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('map.title') || 'Mapa'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('map.subtitle') || 'Visualizacao geografica de ativos e intervencoes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title={t('common.refresh') || 'Atualizar'}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setRoutePlanningMode(!routePlanningMode)}
            className={`inline-flex items-center px-3 py-2 rounded-lg ${
              routePlanningMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <RouteIcon className="h-4 w-4 mr-2" />
            {t('map.planRoute') || 'Planear Rota'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 flex gap-4">
        {/* Sidebar */}
        <div className="w-72 bg-white dark:bg-gray-800 rounded-lg shadow p-4 overflow-y-auto">
          {/* Statistics */}
          {statistics && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t('map.statistics') || 'Estatisticas'}
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('map.assetsWithGps') || 'Ativos com GPS'}:</span>
                  <span className="font-medium">{statistics.assets_with_gps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('map.openInterventions') || 'Intervencoes abertas'}:</span>
                  <span className="font-medium">{statistics.open_interventions}</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <Filter className="h-4 w-4 mr-1" />
              {t('common.filters') || 'Filtros'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('common.status') || 'Estado'}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="">{t('common.all') || 'Todos'}</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Manutencao Necessaria">Manutencao Necessaria</option>
                  <option value="Em Reparacao">Em Reparacao</option>
                  <option value="Desativado">Desativado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('map.municipality') || 'Municipio'}</label>
                <select
                  value={municipalityFilter}
                  onChange={(e) => setMunicipalityFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                >
                  <option value="">{t('common.all') || 'Todos'}</option>
                  {municipalities.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Layers */}
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <Layers className="h-4 w-4 mr-1" />
              {t('map.layers') || 'Camadas'}
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAssets}
                  onChange={(e) => setShowAssets(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm">{t('map.assets') || 'Ativos'} ({assets.length})</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInterventions}
                  onChange={(e) => setShowInterventions(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Wrench className="h-4 w-4 text-orange-600" />
                <span className="text-sm">{t('map.interventions') || 'Intervencoes'} ({interventions.length})</span>
              </label>
            </div>
          </div>

          {/* Route Planning Panel */}
          {routePlanningMode && (
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <RouteIcon className="h-4 w-4 mr-1" />
                {t('map.routePlanning') || 'Planeamento de Rota'}
              </h3>

              {/* Starting Point Selection */}
              <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t('map.startingPoint') || 'Ponto de Partida'}
                  </span>
                  {startingPoint && (
                    <button
                      onClick={() => setStartingPoint(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {startingPoint ? (
                  <p className="text-xs text-green-600">
                    {startingPoint.lat.toFixed(6)}, {startingPoint.lng.toFixed(6)}
                  </p>
                ) : (
                  <button
                    onClick={() => setSelectingStartPoint(true)}
                    className={`w-full text-xs px-2 py-1.5 rounded flex items-center justify-center gap-1 ${
                      selectingStartPoint
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                    }`}
                  >
                    <Crosshair className="h-3 w-3" />
                    {selectingStartPoint
                      ? (t('map.selectStartingPoint') || 'Clique no mapa...')
                      : (t('map.selectStartingPoint') || 'Selecionar no mapa')
                    }
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-2">
                {t('map.selectInterventions') || 'Clique nas intervencoes no mapa para adicionar a rota'}
              </p>

              <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                {selectedInterventions.map((id, index) => {
                  const intervention = interventions.find(i => i.id === id)
                  return intervention ? (
                    <div key={id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 p-1 rounded">
                      <span>{index + 1}. {intervention.asset_serial}</span>
                      <button
                        onClick={() => toggleInterventionSelection(id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={calculateRoute}
                  disabled={selectedInterventions.length === 0}
                  className="flex-1 inline-flex items-center justify-center px-2 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  <Play className="h-3 w-3 mr-1" />
                  {t('map.calculate') || 'Calcular'}
                </button>
                <button
                  onClick={clearRoute}
                  className="px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded"
                >
                  {t('common.clear') || 'Limpar'}
                </button>
              </div>

              {routeStats && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                  <div className="flex justify-between">
                    <span>{t('map.totalDistance') || 'Distancia total'}:</span>
                    <span className="font-medium">{routeStats.distance} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('map.estimatedTime') || 'Tempo estimado'}:</span>
                    <span className="font-medium">{routeStats.time} min</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('map.legend') || 'Legenda'}
            </h3>
            <div className="space-y-1 text-xs">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-lg overflow-hidden shadow">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                <p className="text-gray-500">{t('common.loading') || 'A carregar...'}</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              className="h-full w-full"
              style={{ minHeight: '400px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {allPositions.length > 0 && <FitBounds positions={allPositions} />}

              {/* Map click handler for starting point */}
              <MapClickHandler active={selectingStartPoint} onMapClick={handleMapClick} />

              {/* Starting Point Marker */}
              {startingPoint && (
                <Marker
                  position={[startingPoint.lat, startingPoint.lng]}
                  icon={startingPointIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{t('map.startingPoint') || 'Ponto de Partida'}</strong>
                      <p className="text-xs text-gray-500">
                        {startingPoint.lat.toFixed(6)}, {startingPoint.lng.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Asset Markers */}
              {showAssets && assets.map(asset => (
                <Marker
                  key={`asset-${asset.id}`}
                  position={[asset.latitude, asset.longitude]}
                  icon={createCustomIcon(statusColors[asset.status] || '#6b7280')}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h4 className="font-semibold text-sm mb-1">{asset.serial_number}</h4>
                      <div className="text-xs space-y-1 text-gray-600">
                        <p><strong>{t('map.status') || 'Estado'}:</strong> {asset.status}</p>
                        {asset.model && <p><strong>{t('map.model') || 'Modelo'}:</strong> {asset.model}</p>}
                        {asset.manufacturer && <p><strong>{t('map.manufacturer') || 'Fabricante'}:</strong> {asset.manufacturer}</p>}
                        {asset.street_address && <p><strong>{t('map.address') || 'Morada'}:</strong> {asset.street_address}</p>}
                        {asset.municipality && <p><strong>{t('map.municipality') || 'Municipio'}:</strong> {asset.municipality}</p>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => navigate(`/assets/${asset.serial_number}`)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          {t('common.view') || 'Ver'}
                        </button>
                        <button
                          onClick={() => navigate(`/interventions/new?asset=${asset.serial_number}`)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                        >
                          <Plus className="h-3 w-3 inline mr-1" />
                          {t('map.newIntervention') || 'Intervencao'}
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Intervention Markers */}
              {showInterventions && interventions.map(intervention => (
                <Marker
                  key={`intervention-${intervention.id}`}
                  position={[intervention.latitude, intervention.longitude]}
                  icon={createCustomIcon(interventionTypeColors[intervention.intervention_type] || '#6b7280')}
                  eventHandlers={{
                    click: () => {
                      if (routePlanningMode) {
                        toggleInterventionSelection(intervention.id)
                      }
                    }
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h4 className="font-semibold text-sm mb-1">
                        {intervention.asset_serial}
                        {selectedInterventions.includes(intervention.id) && (
                          <span className="ml-1 text-blue-600">#{selectedInterventions.indexOf(intervention.id) + 1}</span>
                        )}
                      </h4>
                      <div className="text-xs space-y-1 text-gray-600">
                        <p><strong>{t('map.type') || 'Tipo'}:</strong> {intervention.intervention_type}</p>
                        <p><strong>{t('map.status') || 'Estado'}:</strong> {intervention.status}</p>
                        {intervention.problem_description && (
                          <p><strong>{t('map.problem') || 'Problema'}:</strong> {intervention.problem_description.substring(0, 50)}...</p>
                        )}
                        <p><strong>{t('map.createdBy') || 'Criado por'}:</strong> {intervention.created_by_name}</p>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => navigate(`/interventions/${intervention.id}`)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          {t('common.view') || 'Ver'}
                        </button>
                        {routePlanningMode && (
                          <button
                            onClick={() => toggleInterventionSelection(intervention.id)}
                            className={`text-xs px-2 py-1 rounded ${
                              selectedInterventions.includes(intervention.id)
                                ? 'bg-red-600 text-white'
                                : 'bg-green-600 text-white'
                            }`}
                          >
                            {selectedInterventions.includes(intervention.id) ? (
                              <><X className="h-3 w-3 inline mr-1" />{t('common.remove') || 'Remover'}</>
                            ) : (
                              <><Plus className="h-3 w-3 inline mr-1" />{t('map.addToRoute') || 'Adicionar'}</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Route Line - Real road route from OSRM or fallback to straight lines */}
              {routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0 ? (
                <Polyline
                  positions={routeGeometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number])}
                  color="#3b82f6"
                  weight={5}
                  opacity={0.8}
                />
              ) : routeWaypoints.length > 1 && (
                <Polyline
                  positions={routeWaypoints.map(wp => [wp.latitude, wp.longitude])}
                  color="#3b82f6"
                  weight={4}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}

              {/* Route Waypoint Numbers */}
              {routeWaypoints.map((wp, index) => (
                <Marker
                  key={`waypoint-${wp.id}`}
                  position={[wp.latitude, wp.longitude]}
                  icon={L.divIcon({
                    className: 'route-number',
                    html: `<div style="
                      background-color: #3b82f6;
                      color: white;
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 11px;
                      font-weight: bold;
                      border: 2px solid white;
                      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    ">${index + 1}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                />
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Map Module Component
export default function Map() {
  return (
    <Routes>
      <Route index element={<MapView />} />
    </Routes>
  )
}
