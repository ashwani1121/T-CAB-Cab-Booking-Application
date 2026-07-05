import React, { useState, useEffect, useRef } from 'react';
import { MapPin, User, X, ExternalLink, Volume2, VolumeX, Phone } from 'lucide-react';
const SOSModal = ({ notification, onClose, onAction }) => {
	const [timeElapsed, setTimeElapsed] = useState('0m');
	const [isMuted, setIsMuted]         = useState(false);
	const audioRef                      = useRef(null);
	const intervalRef                   = useRef(null);

	useEffect(() => {
		if(notification?.data?.timestamp){
			const startTime         = new Date(notification.data.timestamp);
			const updateTime        = () => {
				const now           = new Date();
				const diffInMs      = now - startTime;
				const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
				const diffInHours   = Math.floor(diffInMinutes / 60);
				if(diffInHours > 0){
					setTimeElapsed(`${diffInHours}h ${diffInMinutes % 60}m`);
				}else{
					setTimeElapsed(`${diffInMinutes}m`);
				}
			};
			updateTime();
			intervalRef.current = setInterval(updateTime, 60000);
			return () => {
				if(intervalRef.current){
					clearInterval(intervalRef.current);
				}
			};
		}
	}, [notification?.data?.timestamp]);

	useEffect(() => {
		const playAlertSound = async () => {
			if(audioRef.current && !isMuted){
				try{
					audioRef.current.currentTime = 0;
					audioRef.current.volume = 0.6;
					await audioRef.current.play();
				}catch(error){
					console.warn('Could not play alert sound:', error);
				}
			}
		};
		playAlertSound();
		return () => {
			if(audioRef.current){
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			}
		};
	}, [isMuted]);

	const toggleMute = () => {
		setIsMuted(!isMuted);
		if(audioRef.current){
			if(isMuted){
				audioRef.current.play().catch(() => {});
			}else{
				audioRef.current.pause();
			}
		}
	};

	const makeCall = (phoneNumber) => {
		if(phoneNumber){
			const cleanNumber = phoneNumber.replace(/\s/g, '');
			window.open(`tel:${cleanNumber}`, '_self');
		}
	};

	useEffect(() => {
		return () => {
			if(intervalRef.current) clearInterval(intervalRef.current);
			if(audioRef.current){
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			}
		};
	}, []);

	if(!notification) return null;
	const data         = notification.data || {};
	const openLocation = (lat, lng, name) => {
		if(lat && lng){
			window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
		}
	};

	const handleClose = () => {
		if(audioRef.current){
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		onClose();
	};

	return(
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 z-50">
			<audio ref={audioRef} loop preload="auto">
				<source src="/notification-sound.mp3" type="audio/mpeg" />
				<source src="/notification-sound.wav" type="audio/wav" />
			</audio>
			<div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-red-200">
				{/* Alert Header */}
				<div className="bg-red-600 px-4 py-3 rounded-t-lg">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
							<span className="text-white font-medium text-sm">EMERGENCY ALERT</span>
						</div>
						<div className="flex items-center gap-1">
							<button
								onClick={toggleMute}
								className="text-white/80 hover:text-white p-1"
								title={isMuted ? 'Unmute alert' : 'Mute alert'}
							>
								{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
							</button>
							<button
								onClick={handleClose}
								className="text-white/80 hover:text-white p-1"
								title="Close alert"
							>
								<X size={16} />
							</button>
						</div>
					</div>
				</div>
				<div className="p-4 space-y-4">
					{/* Status */}
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">Time elapsed:</span>
						<span className="font-medium text-red-600">{timeElapsed}</span>
					</div>
					{/* Alert ID */}
					{data.alertId && (
						<div className="text-xs text-gray-500">
							Alert ID: {data.alertId}
						</div>
					)}
					{/* Passenger */}
					<div className="border border-gray-200 rounded-md p-3">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
									<User size={14} className="text-blue-600" />
								</div>
								<span className="font-medium text-gray-900 text-sm">Passenger</span>
							</div>
							{data.passengerMobile && (
								<button
									onClick={() => makeCall(data.passengerMobile)}
									className="text-blue-600 hover:text-blue-700 p-1"
									title={`Call ${data.passengerMobile}`}
								>
									<Phone size={14} />
								</button>
							)}
						</div>
						<div className="text-sm text-gray-600 mb-2">
							{data.passengerName || 'Name not available'}
						</div>
						{data.passengerMobile && (
							<div className="text-xs text-gray-500 mb-2">
								Mobile: {data.passengerMobile}
							</div>
						)}
						{data.passengerLatitude && data.passengerLongitude && (
							<div className="bg-gray-50 rounded p-2">
								<div className="flex items-start gap-2">
									<MapPin size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
									<div className="flex-1 min-w-0">
										{data.passengerAddress && (
											<div className="text-xs text-gray-700 mb-1 leading-relaxed">
												{data.passengerAddress}
											</div>
										)}
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs text-gray-500 font-mono">
												{parseFloat(data.passengerLatitude).toFixed(4)}, {parseFloat(data.passengerLongitude).toFixed(4)}
											</span>
											<button
												onClick={() => openLocation(data.passengerLatitude, data.passengerLongitude, 'Passenger')}
												className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
												title="View location on map"
											>
												View <ExternalLink size={10} />
											</button>
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
					{/* Driver */}
					{data.driverId && (
						<div className="border border-gray-200 rounded-md p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
										<User size={14} className="text-orange-600" />
									</div>
									<span className="font-medium text-gray-900 text-sm">Driver</span>
								</div>
								{data.driverMobile && (
									<button
										onClick={() => makeCall(data.driverMobile)}
										className="text-orange-600 hover:text-orange-700 p-1"
										title={`Call ${data.driverMobile}`}
									>
										<Phone size={14} />
									</button>
								)}
							</div>
							<div className="text-sm text-gray-600 mb-2">
								{data.driverName || 'Name not available'}
							</div>
							{data.driverMobile && (
								<div className="text-xs text-gray-500">
									Mobile: {data.driverMobile}
								</div>
							)}
						</div>
					)}
					{/* Ride Information */}
					{data.rideId && (
						<div className="border border-gray-200 rounded-md p-3">
							<div className="text-xs font-medium text-gray-700 mb-2">Ride Information</div>
							<div className="space-y-1 text-xs text-gray-600">
								{data.pickupAddress && (
									<div>Pickup: {data.pickupAddress}</div>
								)}
								{data.rideStarted && data.rideStarted !== 'null' && (
									<div>Started: {new Date(data.rideStarted).toLocaleString()}</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
export default SOSModal;