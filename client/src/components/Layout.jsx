import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Bus, LayoutDashboard, ChevronDown, ChevronRight, Target, Settings, Menu, X, Car, Map, BadgePercent, PersonStanding, MapPinCheck, CalendarCheck,
	ShieldPlus, Handshake, MessageSquareMore, Bell, BellRing, Clock, AlertCircle, Trash2, CircleCheckBig, Star, Trophy, Ban, Lock, Percent, Layers, ShieldUser, Package, DollarSign, ArrowLeftRight, 
	Trash, Settings2, Copyright} from "lucide-react" 
import bannerImageUrl from '../assets/tCab_banner.png'; 
import { Link, useLocation, useNavigate } from 'react-router-dom'; 
import { useTheme } from '../context/themeContext';
import { toast } from 'react-toastify';
import axios from "../utils/axios";
import PropTypes from 'prop-types';
import SOSModal from './SOSModal';
import { requestFCMToken, notificationManager, clearFCMTokenData } from '../services/FirebaseService';

function Layout({ children }){
	const { theme }                                               = useTheme();
	const [sidebarOpen, setSidebarOpen]                           = useState(false);
	const [isMobile, setIsMobile]                                 = useState(window.innerWidth < 768);
	const [isHovered, setIsHovered]                               = useState(false);
	const [dropdownOpen, setDropdownOpen]                         = useState(false);
	const [companyName, setCompanyName]                           = useState(localStorage.getItem('companyName') || 'TCab');
	const [companyLogo, setCompanyLogo]                           = useState(localStorage.getItem('companyLogo') || null);
	const location                                                = useLocation();
	const navigate                                                = useNavigate();
	const dropdownRef                                             = useRef(null);
	const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
	const [notifications, setNotifications]                       = useState([]);
	const [unreadCount, setUnreadCount]                           = useState(0);
	const [loading, setLoading]                                   = useState(false);
	const notificationDropdownRef                                 = useRef(null);
	const [sosNotification, setSOSNotification] 				  = useState(null);
	const [showSOSModal, setShowSOSModal] 						  = useState(false);
	const [permissions, setPermissions]                           = useState({});
	const [expandedGroups, setExpandedGroups]                     = useState({});
	const toggleMobileSidebar 									  = () => setSidebarOpen((prev) => !prev);
	const toggleDropdown 										  = () => setDropdownOpen((prev) => !prev);

	const getCurrentUser = () => {
		try{
			const userStr = localStorage.getItem('adminUser');
			return userStr ? JSON.parse(userStr) : null;
		}catch(error){
			console.error('Error parsing user from localStorage:', error);
			return null;
		}
	};

	const fetchPermissions = async () => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/permission/user/${user.id}`);
			if(response.data.success){
				const permMap = {};
				response.data.data.permissions.forEach(p => {
					permMap[p.module] = p;
				});
				localStorage.setItem('userPermissions', JSON.stringify(permMap));
            	window.dispatchEvent(new Event('permissionsUpdated'));
				setPermissions(permMap);
			}
		}catch(error){
			console.error('Error fetching permissions:', error);
			const cached = localStorage.getItem('userPermissions');
			if(cached){
				setPermissions(JSON.parse(cached));
			}
		}
	};

	const fetchNotifications = async () => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			setLoading(true);
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/notification/user/${user.id}`);
			if(response.data.success){
				setNotifications(response.data.data.notifications);
				setUnreadCount(response.data.data.unreadCount);
			}
		}catch(error){
			console.error('Error fetching notifications:', error);
		}finally{
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPermissions();
		fetchNotifications();
	}, []);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if(notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)){
				setNotificationDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const saveNotificationToDatabase = async (notificationData) => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			await axios.post(`${import.meta.env.VITE_API_URL}/admin/notification/create`, {
				user_id: user.id,
				title: notificationData.title,
				body: notificationData.body,
				type: notificationData.type || 'general',
				data: notificationData.data || {}
			});
		}catch(error){
			console.error('Error saving notification to database:', error);
		}
	};

	useEffect(() => {
		let unsubscribeFromNotifications = null;
		const initializeNotifications = async () => {
			try{
				let token = localStorage.getItem('fcmToken');
				if(!token){
					token = await requestFCMToken();
					if(token){
						localStorage.setItem('fcmToken', token);
					}
				}else{
					console.log('✅ Using existing FCM token from login');
				}
				if(!token){
					console.error('❌ Failed to get FCM token');
					return;
				}
				unsubscribeFromNotifications = notificationManager.subscribe(async (payload) => {
					const title = payload.notification?.title || payload.data?.title || 'New Notification';
					const body = payload.notification?.body || payload.data?.message || 'You have a new message';
					const notificationType = payload.data?.type || 'general';
					console.log('📨 Foreground notification received:', {
						type: notificationType,
						title,
						body
					});
					// Handle SOS notifications
					if(notificationType === 'SOS_EMERGENCY' || notificationType === 'SOS_ALERT'){
						console.log('🆘 SOS notification detected, showing modal');
						playNotificationSound('emergency');
						setSOSNotification(payload);
						setShowSOSModal(true);
						return;
					}
					// Handle Custom Trip notifications
					if(notificationType === 'CUSTOM_TRIP_REQUEST'){
						console.log('🚗 Custom trip notification detected');
						playNotificationSound('notification');
						await saveNotificationToDatabase({
							title,
							body,
							type: notificationType,
							data: payload.data || {}
						});
						await fetchNotifications();
						const CustomTripToast = () => (
							<div className="flex items-center gap-3 p-2">
								<div className="flex-shrink-0">
									<div 
										className="w-10 h-10 rounded-full flex items-center justify-center"
										style={{ backgroundColor: `${theme.primaryGradientStart}20` }}
									>
										<Car size={20} style={{ color: theme.primaryGradientStart }} />
									</div>
								</div>
								<div className="flex-grow">
									<div className="font-semibold text-gray-800 text-sm">
										New Custom Trip Request
									</div>
									<div className="text-xs text-gray-600 mt-0.5">
										{payload.data?.user_name} - {payload.data?.custom_km}km, {payload.data?.custom_days} day(s)
									</div>
								</div>
							</div>
						);
						toast(<CustomTripToast />, {
							toastId: `custom-trip-${payload.data?.ride_request_id}-${Date.now()}`,
							position: "top-right",
							autoClose: 6000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
							onClick: () => {
								navigate(`/riderequest?id=${payload.data?.ride_request_id}`);
							},
							style: {
								cursor: 'pointer'
							}
						});
						return;
					}
					// Handle Ride Transfer notifications
					if(notificationType === 'RIDE_TRANSFERRED'){
						console.log('🔄 Ride transfer notification detected');
						playNotificationSound('notification');
						await saveNotificationToDatabase({
							title,
							body,
							type: notificationType,
							data: payload.data || {}
						});
						await fetchNotifications();
						const RideTransferToast = () => (
							<div className="flex items-center gap-3 p-2">
								<div className="flex-shrink-0">
									<div 
										className="w-10 h-10 rounded-full flex items-center justify-center"
										style={{ backgroundColor: `${theme.primaryGradientStart}20` }}
									>
										<ArrowLeftRight 
											size={20} 
											style={{ color: theme.primaryGradientStart }} 
										/>
									</div>
								</div>
								<div className="flex-grow">
									<div className="font-semibold text-gray-800 text-sm">
										Ride Transferred
									</div>
									<div className="text-xs text-gray-600 mt-0.5">
										{payload.data?.driver_name} transferred {payload.data?.vehicle_type} for {payload.data?.passenger_name}
									</div>
								</div>
							</div>
						);
						toast(<RideTransferToast />, {
							toastId: `ride-transfer-${payload.data?.ride_request_id}-${Date.now()}`,
							position: "top-right",
							autoClose: 6000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
							onClick: () => {
								navigate(`/riderequest?id=${payload.data?.ride_request_id}`);
							},
							style: {
								cursor: 'pointer',
								borderLeft: `4px solid ${theme.primaryGradientStart}`
							}
						});
						return;
					}
					// Handle general notifications
					await saveNotificationToDatabase({
						title,
						body,
						type: notificationType,
						data: payload.data || {}
					});
					await fetchNotifications();
					const SimpleToast = () => (
						<div className="flex items-center gap-3 p-2">
							<div className="flex-grow">
								<div className="font-semibold text-gray-800 text-sm">New Message</div>
							</div>
						</div>
					);
					toast(<SimpleToast />, {
						toastId: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						position: "top-right",
						autoClose: 4000,
						hideProgressBar: false,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						type: 'info'
					});
				});
			}catch(error){
				console.error('❌ Failed to initialize notifications:', error);
			}
		};
		const handleServiceWorkerMessage = async (event) => {
			if(event.data && event.data.type === 'SOS_NOTIFICATION'){
				const payload = event.data.payload;
				const notificationType = payload.data?.type || 'general';
				if(notificationType === 'SOS_EMERGENCY' || notificationType === 'SOS_ALERT'){
					playNotificationSound('emergency');
					setSOSNotification({
						notification: payload.notification,
						data: payload.data
					});
					setShowSOSModal(true);
				}
			}else 
			if(event.data && event.data.type === 'CUSTOM_TRIP_NOTIFICATION'){
				const payload = event.data.payload;
				playNotificationSound('notification');
				await saveNotificationToDatabase({
					title: payload.notification?.title || 'New Custom Trip Request',
					body: payload.notification?.body || 'You have a new custom trip request',
					type: 'CUSTOM_TRIP_REQUEST',
					data: payload.data || {}
				});
				await fetchNotifications();
				const CustomTripToast = () => (
					<div className="flex items-center gap-3 p-2">
						<div className="flex-shrink-0">
							<div 
								className="w-10 h-10 rounded-full flex items-center justify-center"
								style={{ backgroundColor: `${theme.primaryGradientStart}20` }}
							>
								<Car size={20} style={{ color: theme.primaryGradientStart }} />
							</div>
						</div>
						<div className="flex-grow">
							<div className="font-semibold text-gray-800 text-sm">
								New Custom Trip Request
							</div>
							<div className="text-xs text-gray-600 mt-0.5">
								Check your notifications for details
							</div>
						</div>
					</div>
				);
				toast(<CustomTripToast />, {
					toastId: `custom-trip-bg-${Date.now()}`,
					position: "top-right",
					autoClose: 6000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					onClick: () => {
						const rideRequestId = payload.data?.ride_request_id;
						if(rideRequestId){
							navigate(`/riderequest?id=${rideRequestId}`);
						}else{
							navigate('/riderequest');
						}
					}
				});
			}
			// Handle Ride Transfer Background Notifications
			else 
			if(event.data && event.data.type === 'RIDE_TRANSFER_NOTIFICATION'){
				const payload = event.data.payload;
				playNotificationSound('notification');
				await saveNotificationToDatabase({
					title: payload.notification?.title || 'Ride Transferred',
					body: payload.notification?.body || 'A driver has transferred a ride',
					type: 'RIDE_TRANSFERRED',
					data: payload.data || {}
				});
				await fetchNotifications();
				const RideTransferToast = () => (
					<div className="flex items-center gap-3 p-2">
						<div className="flex-shrink-0">
							<div 
								className="w-10 h-10 rounded-full flex items-center justify-center"
								style={{ backgroundColor: `${theme.primaryGradientStart}20` }}
							>
								<ArrowLeftRight 
									size={20} 
									style={{ color: theme.primaryGradientStart }} 
								/>
							</div>
						</div>
						<div className="flex-grow">
							<div className="font-semibold text-gray-800 text-sm">
								Ride Transferred
							</div>
							<div className="text-xs text-gray-600 mt-0.5">
								Check your notifications for details
							</div>
						</div>
					</div>
				);
				toast(<RideTransferToast />, {
					toastId: `ride-transfer-bg-${Date.now()}`,
					position: "top-right",
					autoClose: 6000,
					hideProgressBar: false,
					closeOnClick: true,
					pauseOnHover: true,
					draggable: true,
					onClick: () => {
						const rideRequestId = payload.data?.ride_request_id;
						if(rideRequestId){
							navigate(`/riderequest?id=${rideRequestId}`);
						}else{
							navigate('/riderequest');
						}
					},
					style: {
						cursor: 'pointer',
						borderLeft: `4px solid ${theme.primaryGradientStart}`
					}
				});
			}
			else 
			if(event.data && event.data.type === 'BACKGROUND_NOTIFICATION'){
				const payload = event.data.payload;
				await saveNotificationToDatabase({
					title: payload.notification?.title || 'New Notification',
					body: payload.notification?.body || 'You have a new message',
					type: payload.data?.type || 'general',
					data: payload.data || {}
				});
				await fetchNotifications();
			}else 
			if(event.data && event.data.type === 'NAVIGATE'){
				navigate(event.data.url);
			}
		};
		const user = localStorage.getItem('user');
		if(user){
			initializeNotifications();
			navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
		}
		return () => {
			if(unsubscribeFromNotifications){
				unsubscribeFromNotifications();
			}
			navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
		};
	}, [navigate, theme.primaryGradientStart]);

	// Add sound playing function in your Layout component
	const playNotificationSound = (type = 'default') => {
		try{
			const soundMap = {
				'emergency'		: '/sounds/emergency.mp3',
				'alert'			: '/sounds/alert.mp3',
				'notification'	: '/sounds/notification.mp3',
				'default'		: '/sounds/default.mp3'
			};
			const soundUrl 		= soundMap[type] || soundMap['default'];
			const audio 		= new Audio(soundUrl);
			audio.volume 		= 0.7; // 70% volume
			audio.play().catch(error => {
				console.warn('⚠️ Could not play notification sound:', error);
				// Fallback: Try to use system notification
				if('vibrate' in navigator){
					navigator.vibrate([200, 100, 200]);
				}
			});
		}catch(error){
			console.error('❌ Error playing notification sound:', error);
		}
	};

	const toggleNotificationDropdown = () => {
		setNotificationDropdownOpen(prev => !prev);
	};

	const markAsRead = async (notificationId) => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/notification/${notificationId}/read`, {
				user_id: user.id
			});
			if(response.data.success){
				setNotifications(prev => 
					prev.map(n => 
						n.id === notificationId ? { ...n, read_status: true } : n
					)
				);
				setUnreadCount(prev => Math.max(0, prev - 1));
			}
		}catch(error){
			console.error('Error marking notification as read:', error);
		}
	};

	const markAllAsRead = async () => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/notification/mark-all-read`, {
				user_id: user.id
			});
			if(response.data.success){
				setNotifications(prev => 
					prev.map(n => ({ ...n, read_status: true }))
				);
				setUnreadCount(0);
			}
		}catch(error){
			console.error('Error marking all notifications as read:', error);
		}
	};

	const deleteNotification = async (notificationId) => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/notification/${notificationId}`, {
				data: { user_id: user.id }
			});
			if(response.data.success){
				const deletedNotification = notifications.find(n => n.id === notificationId);
				setNotifications(prev => prev.filter(n => n.id !== notificationId));
				if(deletedNotification && !deletedNotification.read_status) {
					setUnreadCount(prev => Math.max(0, prev - 1));
				}
			}
		}catch(error){
			console.error('Error deleting notification:', error);
		}
	};

	const clearAllNotifications = async () => {
		const user = getCurrentUser();
		if(!user?.id) return;
		try{
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/notification/clear-all`, {
				data: { user_id: user.id }
			});
			if(response.data.success) {
				setNotifications([]);
				setUnreadCount(0);
			}
		}catch(error){
			console.error('Error clearing all notifications:', error);
		}
	};

	const formatTimestamp = (timestamp) => {
		const date        = new Date(timestamp);
		const now         = new Date();
		const diffInHours = (now - date) / (1000 * 60 * 60);
		if(diffInHours < 1){
			const diffInMinutes = Math.floor((now - date) / (1000 * 60));
			return `${diffInMinutes}m ago`;
		}else 
		if(diffInHours < 24){
			return `${Math.floor(diffInHours)}h ago`;
		}else{
			return date.toLocaleDateString();
		}
	};

	const handleSOSAction = async (actionType, sosData) => {
		try{
			const response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/sos/${sosData.sosId}/status`, {
				status: actionType === 'resolve' ? 'resolved' : 'acknowledged',
				resolved_by: 'Admin'
			});
			if(response.data.success){
				toast.success(`SOS has been ${actionType === 'resolve' ? 'resolved' : 'acknowledged'}`);
				setShowSOSModal(false);
				setSOSNotification(null);
			}else{
				throw new Error(response.data.message);
			}
		}catch(error){
			console.error('Error handling SOS action:', error);
			toast.error('Failed to process SOS action. Please try again.');
		}
	};

	useEffect(() => {
		const checkIfMobile = () => {
		const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if(!mobile) setSidebarOpen(false);
		};
		window.addEventListener('resize', checkIfMobile);
		return () => window.removeEventListener('resize', checkIfMobile);
	}, []);

	useEffect(() => {
		const handleStorageChange = () => {
			setCompanyName(localStorage.getItem('companyName') || 'TCab');
			setCompanyLogo(localStorage.getItem('companyLogo') || null);
			const cached = localStorage.getItem('userPermissions');
			if (cached) {
				setPermissions(JSON.parse(cached));
			}
		};
		window.addEventListener('storage', handleStorageChange);
		return () => window.removeEventListener('storage', handleStorageChange);
	}, []);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if(dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const sidebarClasses = useMemo(() => {
		const base = 'fixed inset-y-0 left-0 text-white transition-all duration-300 ease-in-out flex flex-col';
		if(isMobile){
			return `${base} z-60 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-50`;
		}
		return `${base} z-60 ${isHovered ? 'w-50' : 'w-18'}`;
	}, [isMobile, sidebarOpen, isHovered]);

	const contentClasses = useMemo(() => {
		const base = 'flex-1 flex flex-col transition-all duration-300';
		return isMobile ? `${base} ml-0` : `${base} ml-18`;
	}, [isMobile]);

	const styles = useMemo(
		() => ({
			sidebar: {
				background: `linear-gradient(${theme.gradientDirection}, ${theme.sidebarGradientStart}, ${theme.sidebarGradientEnd})`,
				color: 'white',
			},
			activeItem: {
				color: theme.primaryGradientStart,
			},
			mainBackground: {
				backgroundColor: theme.backgroundColor || '#f3f4f6',
			},
			navbarBackground: {
				backgroundColor: theme.navbarColor || '#ffffff',
			},
		}),
		[theme]
	);

	const handleLogout = async () => {
		try{
			const user = JSON.parse(localStorage.getItem('user') || '{}');
			try{
				await axios.post(`${import.meta.env.VITE_API_URL}/admin/logout`, {
					user_id: user.id 
				});
			}catch(apiError){
				console.error('Logout API error:', apiError);
			}
			clearFCMTokenData();
			const itemsToRemove = [
				'user',
				'refresh_token', 
				'remember_token',
				'access_token',
				'token',
				'userPermissions'
			];
			itemsToRemove.forEach(item => {
				localStorage.removeItem(item);
			});
			setPermissions({});
			if(notificationManager){
				notificationManager.stopListening();
			}
			toast.success('Logged out successfully');
			navigate('/signin');
		}catch(error){
			console.error('Logout error:', error);
			localStorage.clear();
			setPermissions({});
			toast.info('Session cleared');
			navigate('/');
		}
	};

	const toggleGroup = (groupName) => {
		setExpandedGroups(prev => {
			const isCurrentlyExpanded = prev[groupName];
			return {
				[groupName]: !isCurrentlyExpanded
			};
		});
	};

	const menuStructure = useMemo(() => {
		return [
			{ name: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', type: 'single' },
			{ name: 'riderequest', icon: Bus, label: 'Trip Details', type: 'single' },
				{
				name: 'transactions',
				icon: ArrowLeftRight,
				label: 'Transactions',
				type: 'group',
				children: [
					{ name: 'driverdeposit', icon: User, label: 'Deposit' },
					{ name: 'advancereservation', icon: PersonStanding, label: 'AdvanceReservation' },
				]
			},
			{
				name: 'finance',
				icon: DollarSign,
				label: 'Finance',
				type: 'group',
				children: [
					{ name: 'vehicleprices', icon: Percent, label: 'Fare' },
					{ name: 'coupons', icon: BadgePercent, label: 'Coupons' },
					{ name: 'packages', icon: Package, label: 'Packages' },
					{ name: 'earnings', icon: Package, label: 'Earnings' },
				]
			},
			{ name: 'reservation', icon: CalendarCheck, label: 'Reservation', type: 'single' },
			{
				name: 'fleet',
				icon: Car,
				label: 'Fleet',
				type: 'group',
				children: [
					{ name: 'passenger', icon: User, label: 'Users' },
					{ name: 'drivers', icon: PersonStanding, label: 'Drivers' },
					{ name: 'deleterequest', icon: Trash, label: 'Delete Request' },
				]
			},
			{ name: 'rankings', icon: Trophy, label: 'Rankings', type: 'single' },
			{ name: 'notification', icon: MessageSquareMore, label: 'Notifications', type: 'single' },
			{ name: 'feedback', icon: Star, label: 'Feedback', type: 'single' },
			{
				name: 'settings',
				icon: Settings,
				label: 'Settings',
				type: 'group',
				children: [
					{ name: 'vehicles', icon: Car, label: 'Vehicle Settings' },
					{ name: 'vehicletypes', icon: Layers, label: 'Variants' },
					{ name: 'services', icon: MapPinCheck, label: 'Service Areas' },
					{ name: 'role', icon: ShieldUser, label: 'Roles' },
					{ name: 'permission', icon: Lock, label: 'Role Permission' },
					{ name: 'team', icon: Handshake, label: 'User Management' },
					{ name: 'trips', icon: Map, label: 'Promotions' },
					{ name: 'cancellationpolicy', icon: Ban, label: 'Cancellation Policy' },
					{ name: 'settings', icon: Settings, label: 'Configurations' },
					{ name: 'subscriptions', icon: Copyright, label: 'Subscriptions' },
				]
			},
			{
				name: 'complaints',
				icon: AlertCircle,
				label: 'Complaints',
				type: 'group',
				children: [
					{ name: 'catcomplaints', icon: User, label: 'Category' },
					{ name: 'subcatcomplaints', icon: User, label: 'Subcategory' },
					{ name: 'complaints', icon: User, label: 'complaints' },
				]
			},
			{ name: 'sos', icon: ShieldPlus, label: 'SOS', type: 'single' },
			{ name: 'mastersettings', icon: Settings2, label: 'Master Settings', type: 'single' },
			{ name: 'licensing', icon: Copyright, label: 'Licensing', type: 'single' },
		];
	}, []);

	const filteredMenu = useMemo(() => {
		return menuStructure.map(item => {
			if (item.type === 'single') {
				if (item.name === 'dashboard') return item;
				const perm = permissions[item.name];
				return perm?.can_view ? item : null;
			} else if (item.type === 'group') {
				const visibleChildren = item.children.filter(child => {
					const perm = permissions[child.name];
					return perm?.can_view;
				});
				return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null;
			}
			return null;
		}).filter(Boolean);
	}, [menuStructure, permissions]);

	const isPathActive = (path) => {
		const currentPath = location.pathname.substring(1) || 'dashboard';
		return currentPath === path;
	};

	const isGroupActive = (children) => {
		const currentPath = location.pathname.substring(1) || 'dashboard';
		return children.some(child => currentPath === child.name);
	};

	const isExpanded = isHovered || (isMobile && sidebarOpen);

	useEffect(() => {
		filteredMenu.forEach(item => {
			if (item.type === 'group' && isGroupActive(item.children)) {
				setExpandedGroups({ [item.name]: true });
			}
		});
	}, [location.pathname, filteredMenu]);

	useEffect(() => {
		if (!isHovered && !isMobile) {
			setExpandedGroups({});
		}
	}, [isHovered, isMobile]);

	useEffect(() => {
		if (isMobile && !sidebarOpen) {
			setExpandedGroups({});
		}
	}, [isMobile, sidebarOpen]);

	return(
		<>
			<style>{`
				.sidebar-icon {
					stroke: white;
					transition: stroke 0.2s ease;
				}
				.group:hover .sidebar-icon {
					stroke: ${theme.primaryGradientStart};
				}
				.group.active .sidebar-icon {
					stroke: ${theme.primaryGradientStart};
				}
				.group:hover .group-hover-theme-color {
					color: ${theme.primaryGradientStart} !important;
				}
			`}</style>
			<div className="flex" style={styles.mainBackground}>
			<div
				className={sidebarClasses}
				style={styles.sidebar}
				onMouseEnter={() => !isMobile && setIsHovered(true)}
				onMouseLeave={() => !isMobile && setIsHovered(false)}
			>
				<div className="sticky top-0 z-10">
					<div className="px-4 py-5">
						{companyLogo ? (
							<div className="flex items-center justify-center">
								<div 
									className={`transition-all duration-300 ${
										isExpanded ? 'w-35 h-10' : 'w-9 h-9'
									}`}
								>
									<img
										src={companyLogo}
										alt={companyName || "Company Logo"}
										className="w-full h-full object-contain"
										onError={() => {
											setCompanyLogo(null);
										}}
									/>
								</div>
							</div>
						) : (
							<div className="flex items-center gap-3">
								<div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
									<Target size={34}/>
								</div>
								<div
									className={`overflow-hidden transition-all duration-300 ${
										isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
									}`}
								>
									<span className="font-bold text-xl whitespace-nowrap">{companyName}</span>
								</div>
							</div>
						)}
					</div>
				</div>

				<nav className="flex-1 px-2 overflow-y-auto sidebar-scroll">
					<ul className="text-sm pb-4">
						{filteredMenu.map((item) => {
							if (item.type === 'single') {
								const isActive = isPathActive(item.name);
								return (
									<li 
										key={item.name}
										className={`mx-2 my-3 cursor-pointer rounded-md transition-colors group ${
											isActive ? 'bg-white active' : 'hover:bg-white'
										}`}
									>
										<Link
											to={`/${item.name}`}
											className="flex items-center w-full p-2"
										>
											<item.icon 
												size={20} 
												className={`min-w-5 sidebar-icon`}
												style={isActive ? { stroke: theme.primaryGradientStart } : undefined}
											/>
											<span
												className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover-theme-color ${
													isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
												}`}
												style={isActive ? styles.activeItem : undefined}
											>
												{item.label}
											</span>
										</Link>
									</li>
								);
							} else if (item.type === 'group') {
								const isGroupExpanded = expandedGroups[item.name];
								const hasActiveChild = isGroupActive(item.children);
								const showSubmenu = (isHovered || (isMobile && sidebarOpen));
								
								return (
									<li key={item.name} className="mx-2 my-2">
										<div
											className={`p-2 cursor-pointer rounded-md flex items-center transition-colors group ${
												hasActiveChild && !showSubmenu ? 'bg-white active' : 'hover:bg-white'
											}`}
											onClick={() => showSubmenu && toggleGroup(item.name)}
										>
											<item.icon 
												size={20} 
												className={`min-w-5 sidebar-icon`}
												style={hasActiveChild && !showSubmenu ? { stroke: theme.primaryGradientStart } : undefined}
											/>
											<span
												className={`ml-3 text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover-theme-color ${
													isExpanded ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
												}`}
												style={hasActiveChild && !showSubmenu ? styles.activeItem : undefined}
											>
												{item.label}
											</span>
											{showSubmenu && (
												<div className={`ml-auto transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
													{isGroupExpanded ? (
														<ChevronDown 
															size={16} 
															className="sidebar-icon"
														/>
													) : (
														<ChevronRight 
															size={16} 
															className="sidebar-icon"
														/>
													)}
												</div>
											)}
										</div>
										
										{showSubmenu && isGroupExpanded && (
											<ul className="ml-4 mt-1">
												{item.children.map((child) => {
													const isChildActive = isPathActive(child.name);
													return (
														<li
														key={child.name}
														className={`my-1 rounded-md transition-colors group ${
															isChildActive ? 'bg-white' : 'hover:bg-white'
														}`}
													>
														<Link
															to={`/${child.name}`}
															className="flex items-center w-full p-2 cursor-pointer rounded-md"
														>
															<span 
																className="text-xs font-medium whitespace-nowrap transition-colors group-hover-theme-color"
																style={isChildActive ? styles.activeItem : undefined}
															>
																{child.label}
															</span>
														</Link>
													</li>
													);
												})}
											</ul>
										)}
									</li>
								);
							}
							return null;
						})}
					</ul>
				</nav>
			</div>

			{isMobile && sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity duration-300"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<div className={contentClasses}>
				<header className="sticky top-0 shadow-sm py-2 z-50" style={styles.navbarBackground}>
					<div className="flex items-center justify-between px-6 py-3">
						<div className="flex items-center gap-3">
							{isMobile && (
								<button
									onClick={toggleMobileSidebar}
									className="inline-flex items-center p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
								>
									<span className="sr-only">Open sidebar</span>
									<Menu size={24} className="text-gray-500" />
								</button>
							)}
						</div>
						  <img 
							src={bannerImageUrl} 
							alt="Banner" 
							className="
							h-8
							sm:h-[calc(var(--spacing)*12)]
							md:h-[calc(var(--spacing)*14)]
							lg:h-[calc(var(--spacing)*16)]
							w-auto max-w-full
							object-contain
							mx-auto
						"
						/>
						<div className="flex items-center gap-4">
							<div className="relative" ref={notificationDropdownRef}>
								<button
									onClick={toggleNotificationDropdown}
									className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
									disabled={loading}
								>
									{unreadCount > 0 ? (
										<BellRing 
											size={20} 
											className={unreadCount > 0 ? 'animate-bell' : ''}
											style={{ color: theme.primaryGradientStart }} 
										/>
									) : (
										<Bell size={20} className="text-gray-500" />
									)}
									{unreadCount > 0 && (
										<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
											{unreadCount > 99 ? '99+' : unreadCount}
										</span>
									)}
								</button>
								{notificationDropdownOpen && (
									<div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
										<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
											<h3 className="text-sm font-semibold text-gray-700">
												Notifications ({notifications.length})
											</h3>
											{notifications.length > 0 && (
												<div className="flex items-center gap-2">
													{unreadCount > 0 && (
														<button
															onClick={markAllAsRead}
															className="text-xs text-blue-600 hover:text-blue-800"
															title="Mark all as read"
															disabled={loading}
														>
															<CircleCheckBig size={14} />
														</button>
													)}
													<button
														onClick={clearAllNotifications}
														className="text-xs text-red-600 hover:text-red-800"
														title="Clear all"
														disabled={loading}
													>
														<Trash2 size={14} />
													</button>
												</div>
											)}
										</div>
										<div className="max-h-80 overflow-y-auto">
											{loading ? (
												<div className="px-4 py-8 text-center text-gray-500">
													<div className="animate-spin mx-auto mb-2 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
													<p className="text-sm">Loading notifications...</p>
												</div>
											) : notifications.length === 0 ? (
												<div className="px-4 py-8 text-center text-gray-500">
													<Bell size={32} className="mx-auto mb-2 opacity-50" />
													<p className="text-sm">No notifications yet</p>
												</div>
											) : (
												notifications.map((notification) => (
													<div
														key={notification.id}
														className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
															!notification.read_status ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
														}`}
														onClick={() => markAsRead(notification.id)}
													>
														<div className="flex items-start justify-between gap-3">
															<div className="flex-1">
																<div className="flex items-center gap-2 mb-1">
																	<span className="text-sm">📢</span>
																	<h4 className="text-sm font-medium text-gray-800 line-clamp-1">
																		{notification.title}
																	</h4>
																	{!notification.read_status && (
																		<div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
																	)}
																</div>
																<p className="text-xs text-gray-600 line-clamp-2 mb-2">
																	{notification.body}
																</p>
																<div className="flex items-center justify-between">
																	<span className="text-xs text-gray-400 flex items-center gap-1">
																		<Clock size={10} />
																		{formatTimestamp(notification.created_at)}
																	</span>
																</div>
															</div>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	deleteNotification(notification.id);
																}}
																className="text-gray-400 hover:text-red-500 flex-shrink-0"
																title="Delete notification"
																disabled={loading}
															>
																<X size={14} />
															</button>
														</div>
													</div>
												))
											)}
										</div>
									</div>
								)}
							</div>
							{/* User Profile Section */}
							<div className="flex items-center">
								<div className="hidden sm:flex items-center gap-3">
									<div className="relative">
										{getCurrentUser()?.profile ? (
											<img
												src={getCurrentUser().profile}
												alt="Profile"
												className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
												onError={(e) => {
													e.target.style.display = 'none';
													e.target.nextSibling.style.display = 'flex';
												}}
											/>
										) : null}
										<div 
											className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getCurrentUser()?.profile ? 'hidden' : 'flex'}`}
											style={{ backgroundColor: theme.primaryGradientStart }}
										>
											{getCurrentUser()?.name ? getCurrentUser().name.charAt(0).toUpperCase() : 'U'}
										</div>
									</div>
								</div>
								{/* User Dropdown */}
								<div className="relative" ref={dropdownRef}>
									<button 
										className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer" 
										onClick={toggleDropdown}
									>
										<div className="sm:hidden">
											{getCurrentUser()?.profile ? (
												<img
													src={getCurrentUser().profile}
													alt="Profile"
													className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
													onError={(e) => {
														e.target.style.display = 'none';
														e.target.nextSibling.style.display = 'flex';
													}}
												/>
											) : null}
											<div 
												className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getCurrentUser()?.profile ? 'hidden' : 'flex'}`}
												style={{ backgroundColor: theme.primaryGradientStart }}
											>
												{getCurrentUser()?.name ? getCurrentUser().name.charAt(0).toUpperCase() : 'U'}
											</div>
										</div>
										<ChevronDown size={16} className="text-gray-500" />
									</button>
									{dropdownOpen && (
										<div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
											<div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
												<div className="flex items-center gap-3">
													<div className="flex-1 min-w-0">
														<div className="text-sm font-semibold text-gray-800 truncate">
															{getCurrentUser()?.name || 'User'}
														</div>
														<div 
															className="inline-block text-xs font-medium capitalize px-2 py-0.5 rounded-full mt-1"
															style={{ 
																backgroundColor: `${theme.primaryGradientStart}15`,
																color: theme.primaryGradientStart 
															}}
														>
															{getCurrentUser()?.role_name || 'Admin'}
														</div>
													</div>
												</div>
											</div>
											<div className="py-1">
												<button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
													<User size={16} className="text-gray-400" />
													My Profile
												</button>
												<button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2">
													<Settings size={16} className="text-gray-400" />
													Settings
												</button>
												<hr className="border-gray-100 my-1" />
												<button
													onClick={handleLogout}
													className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center gap-2"
												>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
													</svg>
													Logout
												</button>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</header>
				{/* Main content area */}
				<main className="flex-1 p-6">{children}</main>
			</div>
			{/* SOS Modal */}
			{showSOSModal && sosNotification && (
				<SOSModal
					notification={sosNotification}
					onClose={() => {
						setShowSOSModal(false);
						setSOSNotification(null);
					}}
					onAction={handleSOSAction}
				/>
			)}
		</div>
		</>
	);
}
Layout.propTypes = {
  children: PropTypes.node.isRequired,
};
export default Layout;