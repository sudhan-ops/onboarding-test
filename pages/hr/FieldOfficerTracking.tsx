import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import type { AttendanceEvent, User } from '../../types';
import { Loader2, MapPin, List, Map as MapIcon } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from '../../components/ui/DatePicker';
import Select from '../../components/ui/Select';
import L from 'leaflet';
import Button from '../../components/ui/Button';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useThemeStore } from '../../store/themeStore';

// Map View Component
const MapView: React.FC<{ events: (AttendanceEvent & { userName: string })[], users: User[] }> = ({ events, users }) => {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.LayerGroup>(L.layerGroup());
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const { theme } = useThemeStore();

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: false 
            }).setView([12.9716, 77.5946], 12); // Bangalore
            markersRef.current.addTo(mapRef.current);
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        }
        
        setTimeout(() => mapRef.current?.invalidateSize(), 100);

    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        const isDark = theme === 'dark';
        const lightTile = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        const tileUrl = isDark ? darkTile : lightTile;

        const attribution = isDark 
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        if (tileLayerRef.current) {
            tileLayerRef.current.setUrl(tileUrl);
            mapRef.current.attributionControl.setPrefix(attribution);
        } else {
            tileLayerRef.current = L.tileLayer(tileUrl, { attribution }).addTo(mapRef.current);
        }
    }, [theme]);

    useEffect(() => {
        markersRef.current.clearLayers();

        const latestUserLocations = new Map<string, AttendanceEvent & { userName: string }>();
        events.forEach(event => {
            if (event.latitude && event.longitude) {
                const existingEvent = latestUserLocations.get(event.userId);
                if (!existingEvent || new Date(event.timestamp) > new Date(existingEvent.timestamp)) {
                    latestUserLocations.set(event.userId, event);
                }
            }
        });

        const userMap = new Map<string, User>(users.map(u => [u.id, u]));
        const markerInstances: L.Marker[] = [];

        latestUserLocations.forEach((event: AttendanceEvent & { userName: string }) => {
            const user = userMap.get(event.userId);
            if (user && event.latitude && event.longitude) {
                const customIcon = L.divIcon({
                    className: '', // leaflet adds its own, we style '.user-marker'
                    html: `<div class="user-marker" style="background-image: url(${user.photoUrl || `https://i.pravatar.cc/150?u=${user.id}`})"></div>`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 56],
                    popupAnchor: [0, -56]
                });

                const marker = L.marker([event.latitude, event.longitude], { icon: customIcon });
                
                marker.bindPopup(`
                    <div class="user-marker-popup">
                        <p class="popup-name">${user.name}</p>
                        <p class="popup-time">Last seen: ${format(new Date(event.timestamp), 'hh:mm a')}</p>
                    </div>
                `);
                
                markersRef.current.addLayer(marker);
                markerInstances.push(marker);
            }
        });

        if (markerInstances.length > 0 && mapRef.current) {
            const group = L.featureGroup(markerInstances);
            mapRef.current.fitBounds(group.getBounds().pad(0.5));
        } else if (mapRef.current) {
             mapRef.current.setView([12.9716, 77.5946], 12); // Reset to Bangalore if no markers
        }

    }, [events, users]);

    return <div ref={mapContainerRef} style={{ height: '600px', width: '100%', borderRadius: '1rem', zIndex: 0 }} />;
};

const MobileActivityCard: React.FC<{ event: (AttendanceEvent & { userName: string }) }> = ({ event }) => (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-3 bg-page flex justify-between items-center">
            <span className="text-sm font-medium text-muted">User</span>
            <span className="font-semibold text-primary-text">{event.userName}</span>
        </div>
        <div className="p-3 space-y-3 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-muted font-medium">Event</span>
                <span className="font-semibold capitalize text-primary-text">{event.type.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted font-medium">Timestamp</span>
                <span className="text-primary-text">{format(new Date(event.timestamp), 'dd MMM, yy - hh:mm a')}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-muted font-medium">Location</span>
                {event.latitude && event.longitude ? (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-accent hover:underline">
                        <MapPin className="h-4 w-4 mr-1"/> View on Map
                    </a>
                ) : <span className="text-primary-text">-</span>}
            </div>
        </div>
    </div>
);


const FieldOfficerTracking: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [events, setEvents] = useState<AttendanceEvent[]>([]);
    const [users, setUsers] = useState<User[]>([]); // Store all users
    const [isLoading, setIsLoading] = useState(true);
    
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedUser, setSelectedUser] = useState<string>('all');
    
    const isMobile = useMediaQuery('(max-width: 767px)');
    const fieldOfficers = useMemo(() => users.filter(u => u.role === 'field_officer'), [users]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            const end = new Date(endDate);
            end.setHours(23,59,59,999);

            const [eventsData, usersData] = await Promise.all([
                api.getAllAttendanceEvents(start.toISOString(), end.toISOString()),
                api.getUsers(),
            ]);
            setEvents(eventsData);
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to fetch tracking data", error);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredEvents = useMemo(() => {
        let results = events;
        if (selectedUser !== 'all') {
            results = results.filter(e => e.userId === selectedUser);
        }
        
        const userMap = new Map<string, User>(users.map(u => [u.id, u]));

        return results
            .map(event => ({ 
                ...event, 
                userName: userMap.get(event.userId)?.name || 'Unknown User',
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [events, users, selectedUser]);
    
    const usersWithActivity = useMemo(() => {
        const activeUserIds = new Set(filteredEvents.map(e => e.userId));
        return users.filter(u => activeUserIds.has(u.id));
    }, [filteredEvents, users]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-accent"/></div>;
        }

        if (viewMode === 'map') {
            return <MapView events={filteredEvents} users={usersWithActivity} />;
        }
        
        if (isMobile) {
            return (
                <div className="space-y-3">
                    {filteredEvents.length === 0 ? (
                        <div className="text-center py-10 text-muted">No events found.</div>
                    ) : (
                        filteredEvents.map((event) => <MobileActivityCard key={event.id} event={event} />)
                    )}
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-border responsive-table">
                   <thead className="bg-page">
                       <tr>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">User</th>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Event</th>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Timestamp</th>
                           <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted uppercase">Location</th>
                       </tr>
                   </thead>
                   <tbody>
                       {filteredEvents.length === 0 ? (
                           <tr><td colSpan={4} className="text-center py-10 text-muted">No events found.</td></tr>
                       ) : (
                           filteredEvents.map((event) => (
                               <tr key={event.id}>
                                   <td data-label="User" className="px-6 py-4 whitespace-nowrap font-medium">{event.userName}</td>
                                   <td data-label="Event" className="px-6 py-4 whitespace-nowrap capitalize">{event.type.replace('-', ' ')}</td>
                                   <td data-label="Timestamp" className="px-6 py-4 whitespace-nowrap text-sm text-muted">{format(new Date(event.timestamp), 'dd MMM, yyyy - hh:mm a')}</td>
                                   <td data-label="Location" className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                                       {event.latitude && event.longitude ? (
                                           <a href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center md:justify-start justify-end text-accent hover:underline">
                                               <MapPin className="h-4 w-4 mr-1"/> View on Map
                                           </a>
                                       ) : ('-')}
                                   </td>
                               </tr>
                           ))
                       )}
                   </tbody>
               </table>
           </div>
        );
    };

    return (
        <div className="p-4 md:bg-card md:p-6 md:rounded-xl md:shadow-card">
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h2 className="text-2xl font-bold text-primary-text flex-shrink-0">User Activity Tracking</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <div className="w-full sm:w-40"><DatePicker label="" id="start-date" value={startDate} onChange={setStartDate} /></div>
                        <div className="w-full sm:w-40"><DatePicker label="" id="end-date" value={endDate} onChange={setEndDate} /></div>
                        <div className="w-full sm:w-48">
                            <Select label="" id="user-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                                <option value="all">All Users</option>
                                {fieldOfficers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="bg-page p-1 rounded-full flex items-center w-fit">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors duration-200 ${
                                viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary-text'
                            }`}
                        >
                            <List className="h-4 w-4" />
                            List View
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors duration-200 ${
                                viewMode === 'map' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-primary-text'
                            }`}
                        >
                            <MapIcon className="h-4 w-4" />
                            Map View
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default FieldOfficerTracking;