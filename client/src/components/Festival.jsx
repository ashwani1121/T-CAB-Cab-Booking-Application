import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Star, Gift, PartyPopper, X } from 'lucide-react';
const FestivalCelebration = () => {
    const [currentFestival, setCurrentFestival] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);

    // Festival data with dates
    const festivals = [
        // Indian Festivals
        { 
        name: 'Diwali', 
        dates: ['2025-09-25', '2025-10-20'], 
        emoji: '🪔', 
        message: 'Happy Diwali! Festival of Lights', 
        colors: ['#FFD700', '#FF6B35', '#F7931E'],
        animation: 'sparkle'
        },
        { 
        name: 'Holi', 
        dates: ['2024-03-25', '2025-03-14'], 
        emoji: '🎨', 
        message: 'Happy Holi! Festival of Colors', 
        colors: ['#FF69B4', '#00CED1', '#FFD700', '#FF6347'],
        animation: 'colorBurst'
        },
        { 
        name: 'Dussehra', 
        dates: ['2024-10-12', '2025-10-02'], 
        emoji: '🏹', 
        message: 'Happy Dussehra! Victory of Good over Evil', 
        colors: ['#FF4500', '#FFD700', '#DC143C'],
        animation: 'sparkle'
        },
        { 
        name: 'Karva Chauth', 
        dates: ['2024-10-20', '2025-10-09'], 
        emoji: '🌙', 
        message: 'Happy Karva Chauth!', 
        colors: ['#4169E1', '#FFD700', '#FF69B4'],
        animation: 'moon'
        },
        
        // South Indian Festivals
        { 
        name: 'Pongal', 
        dates: ['2024-01-15', '2025-01-14'], 
        emoji: '🍯', 
        message: 'Pongalo Pongal! Happy Pongal!', 
        colors: ['#FFD700', '#FF6B35', '#32CD32', '#8B4513'],
        animation: 'harvest'
        },
        
        // International Festivals
        { 
        name: 'Christmas', 
        dates: ['2024-12-25', '2025-12-25'], 
        emoji: '🎄', 
        message: 'Merry Christmas!', 
        colors: ['#DC143C', '#228B22', '#FFD700'],
        animation: 'sparkle'
        },
        { 
        name: 'New Year', 
        dates: ['2024-01-01', '2025-01-01'], 
        emoji: '🎊', 
        message: 'Happy New Year!', 
        colors: ['#FFD700', '#FF1493', '#00BFFF', '#32CD32'],
        animation: 'confetti'
        },
        { 
        name: 'Halloween', 
        dates: ['2024-10-31', '2025-10-31'], 
        emoji: '🎃', 
        message: 'Happy Halloween!', 
        colors: ['#FF6B35', '#4B0082', '#000000'],
        animation: 'spooky'
        },
        { 
        name: "Valentine's Day", 
        dates: ['2024-02-14', '2025-02-14'], 
        emoji: '💝', 
        message: "Happy Valentine's Day!", 
        colors: ['#FF69B4', '#DC143C', '#FFB6C1'],
        animation: 'hearts'
        },
        
        // Other Festivals
        { 
        name: 'Eid ul-Fitr', 
        dates: ['2024-04-10', '2025-03-30'], 
        emoji: '🌙', 
        message: 'Eid Mubarak!', 
        colors: ['#00CED1', '#FFD700', '#32CD32'],
        animation: 'sparkle'
        },
        { 
        name: 'Ganesh Chaturthi', 
        dates: ['2024-09-07', '2025-08-27'], 
        emoji: '🐘', 
        message: 'Ganpati Bappa Morya!', 
        colors: ['#FF6B35', '#FFD700', '#DC143C'],
        animation: 'sparkle'
        }
    ];

    // Check if today matches any festival
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const festival = festivals.find(f => f.dates.includes(today));
        
        if (festival) {
        setCurrentFestival(festival);
        setShowCelebration(true);
        // Auto hide after 15 seconds
        const timer = setTimeout(() => setShowCelebration(false), 15000);
        return () => clearTimeout(timer);
        }
    }, []);

    if (!currentFestival || !showCelebration) {
        return null;
    }

    const renderFloatingElements = () => {
        const { animation, colors } = currentFestival;
        
        switch (animation) {
        case 'sparkle':
            return [...Array(8)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-ping"
                style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
                }}
            >
                <Sparkles 
                size={8 + Math.random() * 6} 
                style={{ color: colors[Math.floor(Math.random() * colors.length)] }}
                />
            </div>
            ));
        
        case 'confetti':
            return [...Array(12)].map((_, i) => (
            <div
                key={i}
                className="absolute w-1 h-1 animate-bounce rounded-full"
                style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.5 + Math.random()}s`
                }}
            />
            ));
        
        case 'hearts':
            return [...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-pulse"
                style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
                }}
            >
                <Heart 
                size={6 + Math.random() * 4} 
                fill={colors[Math.floor(Math.random() * colors.length)]}
                style={{ color: colors[Math.floor(Math.random() * colors.length)] }}
                />
            </div>
            ));
        
        case 'colorBurst':
            return [...Array(10)].map((_, i) => (
            <div
                key={i}
                className="absolute rounded-full animate-ping"
                style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${25 + Math.random() * 50}%`,
                width: `${3 + Math.random() * 4}px`,
                height: `${3 + Math.random() * 4}px`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${0.8 + Math.random() * 0.7}s`
                }}
            />
            ));
        
        case 'harvest':
            return [...Array(8)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-bounce text-sm"
                style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 0.5}s`
                }}
            >
                {Math.random() > 0.7 ? '🌾' : 
                Math.random() > 0.4 ? '🥥' : 
                Math.random() > 0.2 ? '🍯' : '🌴'}
            </div>
            ));
        
        case 'moon':
            return [...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute animate-pulse"
                style={{
                left: `${25 + Math.random() * 50}%`,
                top: `${30 + Math.random() * 40}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random()}s`
                }}
            >
                {Math.random() > 0.5 ? (
                <span style={{ color: colors[Math.floor(Math.random() * colors.length)] }}>🌙</span>
                ) : (
                <Star 
                    size={6 + Math.random() * 4} 
                    fill={colors[Math.floor(Math.random() * colors.length)]}
                    style={{ color: colors[Math.floor(Math.random() * colors.length)] }}
                />
                )}
            </div>
            ));
        
        default:
            return null;
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center relative mx-4">
        {/* Background gradient overlay */}
        <div 
            className="absolute inset-0 rounded-lg opacity-20"
            style={{
            background: `linear-gradient(90deg, ${currentFestival.colors.join(', ')})`
            }}
        />
        
        {/* Floating animation elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {renderFloatingElements()}
        </div>
        
        {/* Main celebration content */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
            {/* Leading emoji */}
            <span 
            className="text-2xl animate-bounce"
            style={{ color: currentFestival.colors[0] }}
            >
            {currentFestival.emoji}
            </span>
            
            {/* Festival message */}
            <div className="text-center">
            <span 
                className="font-semibold text-sm animate-pulse"
                style={{ 
                background: `linear-gradient(90deg, ${currentFestival.colors.join(', ')})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
                }}
            >
                {currentFestival.message}
            </span>
            </div>
            
            {/* Trailing emoji */}
            <span 
            className="text-2xl animate-bounce" 
            style={{ 
                animationDelay: '0.5s',
                color: currentFestival.colors[1] || currentFestival.colors[0]
            }}
            >
            {currentFestival.emoji}
            </span>
            
            {/* Close button */}
            <button
            onClick={() => setShowCelebration(false)}
            className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Close celebration"
            >
            <X size={16} className="text-gray-600" />
            </button>
        </div>
        
        {/* Corner celebration icons */}
        <div className="absolute -top-1 left-2 animate-bounce">
            <PartyPopper size={16} style={{ color: currentFestival.colors[0] }} />
        </div>
        <div className="absolute -top-1 right-2 animate-pulse">
            <Gift size={16} style={{ color: currentFestival.colors[1] || currentFestival.colors[0] }} />
        </div>
        </div>
    );
};

export default FestivalCelebration;
