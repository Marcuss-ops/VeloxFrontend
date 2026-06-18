import React, { useState, useMemo } from 'react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MiniCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        
        const result: (number | null)[] = [];
        
        // Previous month padding
        for (let i = startPadding - 1; i >= 0; i--) {
            result.push(null); // null = previous month day
        }
        
        // Current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            result.push(i);
        }
        
        // Next month padding to complete the grid
        const remaining = 42 - result.length;
        for (let i = 1; i <= remaining; i++) {
            result.push(null);
        }
        
        return result;
    }, [currentDate]);
    
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    const isToday = (day: number | null) => {
        if (!day) return false;
        return day === todayDate && 
               currentDate.getMonth() === todayMonth && 
               currentDate.getFullYear() === todayYear;
    };
    
    return (
        <div style={{ marginTop: 8, marginBottom: 8, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Toggle Button - solo icona */}
            <button
                onClick={() => setShowCalendar(!showCalendar)}
                title="Toggle Calendar"
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: '1px solid transparent',
                    color: 'rgba(148,163,184,0.70)',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    marginBottom: showCalendar ? 8 : 0,
                }}
            >
                <span className="material-symbols-rounded" style={{ fontSize: 22, fontWeight: 400 }}>
                    {showCalendar ? 'expand_less' : 'expand_more'}
                </span>
            </button>
            
            {/* Calendar Popup */}
            {showCalendar && (
                <div style={{
                    width: 220,
                    background: 'rgba(15,12,25,0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 14,
                    border: '1px solid rgba(139,92,246,0.20)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)',
                    padding: 12,
                    position: 'absolute',
                    left: 80,
                    top: 200,
                    zIndex: 100,
                }}>
                    {/* Month Navigation */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                    }}>
                        <button 
                            onClick={prevMonth}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(148,163,184,0.70)',
                                cursor: 'pointer',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_left</span>
                        </button>
                        <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#e2e8f0',
                            letterSpacing: '0.5px',
                        }}>
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button 
                            onClick={nextMonth}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(148,163,184,0.70)',
                                cursor: 'pointer',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>chevron_right</span>
                        </button>
                    </div>
                    
                    {/* Weekday Headers */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 2,
                        marginBottom: 4,
                    }}>
                        {WEEKDAYS.map((day, i) => (
                            <div key={i} style={{
                                textAlign: 'center',
                                fontSize: 9,
                                fontWeight: 700,
                                color: 'rgba(148,163,184,0.50)',
                                padding: '4px 0',
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* Days Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 2,
                    }}>
                        {days.slice(0, 35).map((day, i) => (
                            <div
                                key={i}
                                style={{
                                    aspectRatio: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: isToday(day) ? 700 : 400,
                                    color: day 
                                        ? isToday(day) 
                                            ? '#a78bfa' 
                                            : 'rgba(226,232,240,0.80)'
                                        : 'rgba(148,163,184,0.25)',
                                    borderRadius: 6,
                                    background: isToday(day) 
                                        ? 'rgba(139,92,246,0.25)' 
                                        : 'transparent',
                                    cursor: day ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (day && !isToday(day)) {
                                        e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (day && !isToday(day)) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* Today Button */}
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        style={{
                            width: '100%',
                            marginTop: 10,
                            padding: '6px 0',
                            background: 'rgba(139,92,246,0.15)',
                            border: '1px solid rgba(139,92,246,0.30)',
                            borderRadius: 8,
                            color: '#c4b5fd',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        Today
                    </button>
                </div>
            )}
        </div>
    );
};

export default MiniCalendar;
