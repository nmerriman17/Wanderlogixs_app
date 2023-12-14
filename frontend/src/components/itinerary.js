import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import * as yup from 'yup';
import AppHeader from '../components/header.js';
import './itinerary.css';

const itinerarySchema = yup.object().shape({
    eventName: yup.string().required('Event name is required'),
    location: yup.string().required('Location is required'),
    startDate: yup.date().required('Start date is required').max(yup.ref('endDate'), 'Start date must be before end date'),
    endDate: yup.date().required('End date is required').min(yup.ref('startDate'), 'End date must be after start date'),
    startTime: yup.string().required('Start time is required'),
    endTime: yup.string().required('End time is required'),
    description: yup.string(),
    notification: yup.string()
});

function Itinerary() {
    const [events, setEvents] = useState([]);
    const [editingEventId, setEditingEventId] = useState(null);
    const [eventForm, setEventForm] = useState({
        eventName: '',
        location: '',
        startDate: new Date(),
        endDate: new Date(),
        startTime: '12:00',
        endTime: '12:00',
        description: '',
        notification: ''
    });
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEvents = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Authentication token is missing');
                navigate('/login'); // Redirect to login
                return;
            }
    
            try {
                const response = await fetch('/api/itinerary', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });
    
                if (!response.ok) {
                    // Attempt to parse JSON response, but handle cases where response is not JSON
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonError) {
                        errorData = { message: response.statusText };
                    }
    
                    if (response.status === 403) {
                        console.error('Token expired or invalid', errorData);
                        navigate('/login'); // Redirect to login
                    } else {
                        console.error(`Server responded with status: ${response.status}`, errorData);
                        // Optionally update state with error message for user feedback
                    }
                } else {
                    const data = await response.json();
                    setEvents(data);
                }
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };
    
        fetchEvents();
    }, [navigate, setEvents]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "startDate" || name === "endDate") {
            setEventForm({ ...eventForm, [name]: new Date(value) });
        } else {
            setEventForm({ ...eventForm, [name]: value });
        }
    };

    const formatDateValue = (date) => {
        return date instanceof Date ? date.toISOString().split('T')[0] : '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Authentication token is missing');
            navigate('/login'); // Redirect to login
            return;
        }

        try {
            const validatedData = await itinerarySchema.validate(eventForm, { abortEarly: false });
            // Ensure dates are formatted correctly
            const eventData = {
                ...validatedData,
                startDate: validatedData.startDate.toISOString().split('T')[0],
                endDate: validatedData.endDate.toISOString().split('T')[0]
            };

            const method = editingEventId ? 'PUT' : 'POST';
            const endpoint = editingEventId ? `/api/itinerary/${editingEventId}` : '/api/itinerary';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });

            if (!response.ok) {
                if (response.status === 403) {
                    console.error('Token expired or invalid');
                    navigate('/login'); // Redirect to login
                } else {
                    const errorData = await response.json();
                    setErrors({ serverError: errorData.message });
                    throw new Error('Network response was not ok');
                }
            }

            const updatedEvent = await response.json();
            if (editingEventId) {
                setEvents(events.map(event => event.id === editingEventId ? updatedEvent : event));
            } else {
                setEvents([...events, updatedEvent]);
            }

            resetForm();
            setEditingEventId(null);
        } catch (validationError) {
            if (validationError.inner && Array.isArray(validationError.inner)) {
                setErrors(validationError.inner.reduce((acc, error) => ({
                    ...acc, [error.path]: error.message
                }), {}));
            } else {
                console.error(validationError.message);
            }
        }
    };

    const handleEditEvent = (event) => {
        setEditingEventId(event.id);
        setEventForm({
            eventName: event.eventName,
            location: event.location,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            startTime: event.startTime,
            endTime: event.endTime,
            description: event.description,
            notification: event.notification
        });
    };

    const resetForm = () => {
        setEventForm({
            eventName: '',
            location: '',
            startDate: new Date(),
            endDate: new Date(),
            startTime: '12:00',
            endTime: '12:00',
            description: '',
            notification: ''
        });
        setErrors({});
        setEditingEventId(null);
    };

    const EventDetailsTooltip = ({ event }) => {
        if (!event) return null;
        return (
            <div className="event-details-tooltip">
                <p>Event Name: {event.eventName}</p>
                <p>Location: {event.location}</p>
                {/* Add more details as needed */}
            </div>
        );
    };
    
    const [hoveredEvent, setHoveredEvent] = useState(null);


    return (
        <>
            <AppHeader />
            <div className='calendar-form-container'>
                <div className="calendar-header">
                    <div className="calendar-text">Your Itinerary</div>
                    <div className="underline"></div>
                </div>
                <form onSubmit={handleSubmit} className="itinerary-form">
                    {/* Event Name Input */}
                    <div className="form-row">
                        <div className="input">
                            <input
                                type="text"
                                name="eventName"
                                value={eventForm.eventName}
                                onChange={handleInputChange}
                                placeholder="Event Name"
                            />
                            {errors.eventName && <div className="error">{errors.eventName}</div>}
                        </div>

                        {/* Location Input */}
                        <div className="input">
                            <input
                                type="text"
                                name="location"
                                value={eventForm.location}
                                onChange={handleInputChange}
                                placeholder="Location"
                            />
                            {errors.location && <div className="error">{errors.location}</div>}
                        </div>
                    </div>

                    {/* Date and Time Inputs */}
                    <div className="form-row">
                        <div className="input">
                            <input
                                type="date"
                                name="startDate"
                                value={formatDateValue(eventForm.startDate)}
                                onChange={handleInputChange}
                                placeholder="Start Date"
                            />
                            {errors.startDate && <div className="error">{errors.startDate}</div>}
                        </div>
                        <div className="input">
                            <input
                                type="time"
                                name="startTime"
                                value={eventForm.startTime}
                                onChange={handleInputChange}
                                placeholder="Start Time"
                            />
                            {errors.startTime && <div className="error">{errors.startTime}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="input">
                            <input
                                type="date"
                                name="endDate"
                                value={formatDateValue(eventForm.endDate)}
                                onChange={handleInputChange}
                                placeholder="End Date"
                            />
                            {errors.endDate && <div className="error">{errors.endDate}</div>}
                        </div>
                        <div className="input">
                            <input
                                type="time"
                                name="endTime"
                                value={eventForm.endTime}
                                onChange={handleInputChange}
                                placeholder="End Time"
                            />
                            {errors.endTime && <div className="error">{errors.endTime}</div>}
                        </div>
                    </div>

                    {/* Description and Notification */}
                    <div className="form-row description-row">
                        <div className="input full-width">
                            <textarea
                                name="description"
                                value={eventForm.description}
                                onChange={handleInputChange}
                                placeholder="Description"
                            />
                            {errors.description && <div className="error">{errors.description}</div>}
                        </div>
                    </div>

                    <div className="form-row button-row">
                        <div className="input reminder-select">
                            <label>
                                Set Reminder:
                                <select
                                    name="notification"
                                    value={eventForm.notification}
                                    onChange={handleInputChange}>
                                    <option value="none">None</option>
                                    <option value="15min">15 minutes before</option>
                                    <option value="30min">30 minutes before</option>
                                    <option value="1hour">1 hour before</option>
                                    <option value="1day">1 day before</option>
                                </select>
                            </label>
                            {errors.notification && <div className="error">{errors.notification}</div>}
                        </div>
                        
                        <div className="itinerary-submit-container">
                            <button type="submit" className="btn trip-btn-primary submit">Submit</button>
                            <button type="button" className="btn trip-btn-secondary submit" onClick={resetForm}>Cancel</button>
                        </div>
                    </div>
                </form>

                {/* Calendar Component */}
                <div className="calendar-container">
                <Calendar
                    onChange={(value) => setEventForm({ ...eventForm, startDate: value })}
                    value={eventForm.startDate}
                    className="react-calendar"
                    calendarType="US"
                    tileContent={({ date, view }) => view === 'month' && events.map((event) => {
                        const start = new Date(event.startDate);
                        const end = new Date(event.endDate);
                        if (date >= start && date <= end) {
                            return (
                                <div 
                                    key={event.id} 
                                    className="calendar-event"
                                    onMouseEnter={() => setHoveredEvent(event)}
                                    onMouseLeave={() => setHoveredEvent(null)}
                                    onClick={() => handleEditEvent(event)}
                                >
                                    {event.eventName}
                                </div>
                            );
                        }
                        return null;
                    })}
                />
                {hoveredEvent && (
                    <EventDetailsTooltip event={hoveredEvent} />
                )}
            </div>
            </div>
        </>
    );
}

export default Itinerary;
