import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Layout from './Layout';
import axios from "../utils/axios";
import { toast } from "react-toastify";
import { Car, Users, IndianRupee, UserPlus, RefreshCw, Trophy, Activity, Calendar, ExternalLink, Star, AlertCircle, TrendingUp, DollarSign, CreditCard, TrendingDown, BarChart3, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, LabelList, Tooltip, ResponsiveContainer, ComposedChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line, BarChart } from 'recharts';
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import DriverLocationChart from './DriverLocationChart';

function Dashboard(){
	const navigate  = useNavigate(); 

	// Get date 7 days ago in YYYY-MM-DD format
	const getSevenDaysAgo = () => {
		const date  = new Date();
		date.setDate(date.getDate() - 7);
		const year  = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day   = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	// Get today's date in YYYY-MM-DD format
	const getToday  = () => {
		const today = new Date();
		const year  = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day   = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	};
	
	const { theme }                                       = useTheme();
	const [fromDate, setFromDate]                         = useState(getSevenDaysAgo());
	const [toDate, setToDate]                             = useState(getToday());
	const [dashboardData, setDashboardData]               = useState(null);
	const [loading, setLoading]                           = useState(true);
	const [error, setError]                               = useState(null);
	
	// Chart specific state
	const [chartData, setChartData]                       = useState([]);
	const [chartLoading, setChartLoading]                 = useState(true);
	const [chartError, setChartError]                     = useState(null);

	// Revenue chart specific state
	const [revenueData, setRevenueData]                   = useState([]);
	const [revenueLoading, setRevenueLoading]             = useState(true);
	const [revenueError, setRevenueError]                 = useState(null);

	// ride status chart state 
	const [rideStatusData, setRideStatusData]             = useState([]);
	const [rideStatusLoading, setRideStatusLoading]       = useState(true);
	const [rideStatusError, setRideStatusError]           = useState(null);

	// Payment type chart state
	const [paymentTypeData, setPaymentTypeData]           = useState([]);
	const [paymentTypeLoading, setPaymentTypeLoading]     = useState(true);
	const [paymentTypeError, setPaymentTypeError]         = useState(null);

	// Driver supply vs demand chart state
	const [supplyDemandData, setSupplyDemandData]         = useState([]);
	const [supplyDemandLoading, setSupplyDemandLoading]   = useState(true);
	const [supplyDemandError, setSupplyDemandError]       = useState(null);

	// Top locations chart state
	const [topLocationsData, setTopLocationsData]         = useState([]);
	const [topLocationsLoading, setTopLocationsLoading]   = useState(true);
	const [topLocationsError, setTopLocationsError]       = useState(null);

	// Add initial loading state to prevent flash
	const [isInitialLoad, setIsInitialLoad]               = useState(true);

	const [topDriversData, setTopDriversData] = useState([]);
    const [topDriversLoading, setTopDriversLoading] = useState(true);
    const [topDriversError, setTopDriversError] = useState(null);

	// Counter configuration
	const counterConfig = [
		{
			id      : 'live-rides',
			title   : 'Live Rides',
			dataKey : 'liveRides',
			icon    : Car,
			color   : 'bg-blue-500',
			route   : '/riderequest'
		},
		{
			id      : 'total-passenger',
			title   : 'Total Passengers',
			dataKey : 'totalPassengers',
			icon    : Users,
			color   : 'bg-purple-500',
			route   : '/passenger'
		},
		{
			id      : 'total-drivers',
			title   : 'Total Drivers',
			dataKey : 'totalDrivers',
			icon    : Car,
			color   : 'bg-orange-500',
			route   : '/drivers'
		},
		{
			id      : 'earnings',
			title   : 'Total Earnings',
			dataKey : 'totalEarnings',
			icon    : IndianRupee,
			color   : 'bg-emerald-500',
			route   : '/riderequest'
		},
		{
			id      : 'new-users',
			title   : 'Total New Users',
			dataKey : 'totalNewUsers',
			icon    : UserPlus,
			color   : 'bg-pink-500',
			route   : '/passenger'
		},
		{
			id      : 'total-ride-completed',
			title   : 'Total Ride Completed',
			dataKey : 'totalRideCompleted',
			icon    : Users,
			color   : 'bg-green-500',
			route   : '/riderequest'
		},
	];

	// Loading Component with smooth animation
	const LoadingComponent = ({ message = "Loading dashboard data..." }) => (
		<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
			<div className="relative">
				{/* Outer rotating ring */}
				<div className="w-16 h-16 border-4 border-opacity-20 rounded-full animate-spin"
					style={{ borderColor: theme.primaryGradientStart || '#3b82f6',borderTopColor: 'transparent'}}>
				</div>
				{/* Inner pulsing dot */}
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse"
					 style={{ backgroundColor: theme.primaryGradientEnd || '#1d4ed8' }}>
				</div>
			</div>
			<p className="mt-4 text-sm font-medium animate-pulse">
				{message}
			</p>
		</div>
	);

	// Error Component with better styling
	const ErrorComponent = ({ title, message, onRetry }) => (
		<div className="flex flex-col items-center justify-center h-64 transition-all duration-300">
			<div className="mb-4 p-3 rounded-full bg-red-50 border border-red-200">
				<AlertCircle className="h-8 w-8 text-red-500" />
			</div>
			<div className="text-center mb-6">
				<h3 className="text-lg font-semibold mb-2">
					{title}
				</h3>
				<p className="text-sm max-w-md">
					{message}
				</p>
			</div>
			<ThemeUI.Button
				type           = "button"
				onClick        = {onRetry}
				gradientColors = {{
					start: theme.primaryGradientStart,
					end: theme.primaryGradientEnd,
				}}
				direction      = {theme.gradientDirection}
				className      = "px-6 py-2 transition-all duration-200 hover:scale-105"
			>
				<RefreshCw className="h-4 w-4 mr-2" />
				Try Again
			</ThemeUI.Button>
		</div>
	);

	// Fetch dashboard data from API
	const fetchDashboardData = async () => {
		setLoading(true);
		setError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setDashboardData(result.data);
			}else{
				setError(result.message || 'Failed to fetch dashboard data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching data';
			setError(errorMessage);
			console.error('Dashboard fetch error:', err);
		}finally{
			setLoading(false);
		}
	};

	// Fetch chart data
	const fetchChartData = async () => {
		setChartLoading(true);
		setChartError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/completed-rides-chart`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setChartData(result.data);
			}else{
				setChartError(result.message || 'Failed to fetch chart data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching chart data';
			setChartError(errorMessage);
			console.error('Chart fetch error:', err);
		}finally{
			setChartLoading(false);
		}
	};

	// Fetch revenue chart data
	const fetchRevenueData = async () => {
		setRevenueLoading(true);
		setRevenueError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/revenue-chart`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setRevenueData(result.data);
			}else{
				setRevenueError(result.message || 'Failed to fetch revenue data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching revenue data';
			setRevenueError(errorMessage);
			console.error('Revenue fetch error:', err);
		}finally{
			setRevenueLoading(false);
		}
	};

	// fetch ride status data:
	const fetchRideStatusData = async () => {
		setRideStatusLoading(true);
		setRideStatusError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/ride-status-chart`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setRideStatusData(result.data);
			}else{
				setRideStatusError(result.message || 'Failed to fetch ride status data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching ride status data';
			setRideStatusError(errorMessage);
			console.error('Ride status fetch error:', err);
		}finally{
			setRideStatusLoading(false);
		}
	};

	// Fetch payment type data
	const fetchPaymentTypeData = async () => {
		setPaymentTypeLoading(true);
		setPaymentTypeError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/payment-type-chart`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setPaymentTypeData(result.data);
			}else{
				setPaymentTypeError(result.message || 'Failed to fetch payment type data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching payment type data';
			setPaymentTypeError(errorMessage);
			console.error('Payment type fetch error:', err);
		}finally{
			setPaymentTypeLoading(false);
		}
	};

	// Fetch supply demand data
	const fetchSupplyDemandData = async () => {
		setSupplyDemandLoading(true);
		setSupplyDemandError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/supply-demand-chart`, {
				params: {
					fromDate,
					toDate
				}
			});
			const result = response.data;
			if(result.success){
				setSupplyDemandData(result.data);
			}else{
				setSupplyDemandError(result.message || 'Failed to fetch supply demand data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching supply demand data';
			setSupplyDemandError(errorMessage);
			console.error('Supply demand fetch error:', err);
		}finally{
			setSupplyDemandLoading(false);
		}
	};

	// Fetch top locations data
	const fetchTopLocationsData = async () => {
		setTopLocationsLoading(true);
		setTopLocationsError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/top-locations-chart`, {
				params: {
					fromDate,
					toDate,
					groupBy: 'district',
					limit: 8
				}
			});
			const result = response.data;
			if(result.success){
				setTopLocationsData(result.data);
			}else{
				setTopLocationsError(result.message || 'Failed to fetch top locations data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching top locations data';
			setTopLocationsError(errorMessage);
			console.error('Top locations fetch error:', err);
		}finally{
			setTopLocationsLoading(false);
		}
	};

	// Fetch top drivers data
	const fetchTopDriversData = async () => {
		setTopDriversLoading(true);
		setTopDriversError(null);
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/top-ranking-drivers`, {
				params: { fromDate, toDate, limit: 3 }
			});
			const result = response.data;
			if(result.success){
				const chartData = result.data.map(driver => ({
					...driver,
					name     : driver.name.length > 15 ? driver.name.substring(0, 15) + '...' : driver.name,
					fullName : driver.name,
					score    : driver.score,
					trips    : driver.trips,
					rating   : driver.rating,
					earnings : driver.earnings
				}));
				setTopDriversData(chartData);
			}else{
				setTopDriversError(result.message || 'Failed to fetch top drivers data');
			}
		}catch(err){
			const errorMessage = err.response?.data?.message || 'Network error occurred while fetching drivers data';
			setTopDriversError(errorMessage);
			console.error('Top drivers fetch error:', err);
		}finally{
			setTopDriversLoading(false);
		}
	};

	// Fetch all data
	const fetchAllData = async () => {
		await Promise.all([
			fetchDashboardData(),
			fetchChartData(),
			fetchRevenueData(),
        	fetchRideStatusData(),
			fetchPaymentTypeData(),
			fetchSupplyDemandData(),
			fetchTopLocationsData(),
        	fetchTopDriversData()
		]);
		// Only set initial load to false after first complete fetch
		if(isInitialLoad){
			setIsInitialLoad(false);
		}
	};

	// Fetch data on component mount and when dates change
	useEffect(() => {
		fetchAllData();
	}, []);

	// Format number with commas
	const formatNumber = (num) => {
		if(num === null || num === undefined) return '0';
		return new Intl.NumberFormat('en-IN').format(num);
	};

	// Format change percentage
	const formatChange = (change) => {
		if(change === null || change === undefined || change === 0) return '0%';
		return `${change > 0 ? '+' : ''}${change}%`;
	};

	// Get display value
	const getDisplayValue = (counter, data) => {
		// Add null check for data
		if(!data) return '0';
		const counterData = data[counter.dataKey];
		if(counter.dataKey === 'totalEarnings'){
			return counterData?.formattedValue || '₹0';
		}
		return formatNumber(counterData?.value || 0);
	};

	// Navigate to ride requests with date filters
	const handleViewDetails = () => {
		navigate(`/riderequest`);
	};

	// Top driver label bar
	const RankingBadge = (props) => {
		const { x, y, width, index } = props;
		const getRankingStyle        = (rank) => {
			const styles             = {
			1: { 
				gradientId    : 'goldGradient',
				color         : '#B45309', 
				border        : '#D97706',
				gradientStart : '#FCD34D',
				gradientEnd   : '#F59E0B'
			}, // Gold
			2: { 
				gradientId    : 'silverGradient',
				color         : '#374151', 
				border        : '#6B7280',
				gradientStart : '#F3F4F6',
				gradientEnd   : '#9CA3AF'
			}, // Silver  
			3: { 
				gradientId    : 'bronzeGradient',
				color         : '#92400E', 
				border        : '#D97706',
				gradientStart : '#FED7AA',
				gradientEnd   : '#EA580C'
			}, // Bronze
			default: { 
				gradientId    : 'blueGradient',
				color         : '#1E40AF', 
				border        : '#3B82F6',
				gradientStart : '#DBEAFE',
				gradientEnd   : '#60A5FA'
			} // Blue for 4+
			};
			return styles[rank] || styles.default;
		};
		if (x === undefined || y === undefined || width === undefined || index === undefined) return null;
		const rank   = index + 1;
		const style  = getRankingStyle(rank);
		const badgeX = x + width / 2;
		const badgeY = y - 25;
		return (
			<g>
				{/* Define gradients */}
				<defs>
					<linearGradient id={style.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor={style.gradientStart} />
					<stop offset="100%" stopColor={style.gradientEnd} />
					</linearGradient>
				</defs>
				{/* Badge Background with Gradient */}
				<rect
					x={badgeX - 20}
					y={badgeY - 8}
					width={40}
					height={16}
					rx={8}
					ry={8}
					fill={`url(#${style.gradientId})`}
					stroke={style.border}
					strokeWidth={1}
					style={{
					filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))'
					}}
				/>
				{/* Rank Text */}
				<text
					x={badgeX}
					y={badgeY + 2}
					textAnchor="middle"
					fontSize={11}
					fontWeight="700"
					fill={style.color}
					style={{
					textShadow: '0px 1px 1px rgba(255, 255, 255, 0.8)'
					}}
				>
					#{rank}
				</text>
			</g>
		);
	};

	// Show loading only during initial load or when both are loading
	if(isInitialLoad || (loading && chartLoading)){
		return(
			<Layout>
				<LoadingComponent message="Loading dashboard data..." />
			</Layout>
		);
	}

	// Show error only if we have an error and it's not the initial load
	if(!isInitialLoad && (error || !dashboardData)){
		return(
			<Layout>
				<ErrorComponent 
					title="Dashboard Unavailable"
					message={error || 'No data available'}
					onRetry={fetchAllData}
				/>
			</Layout>
		);
	}

	return(
		<Layout>
			<div className="opacity-0 animate-fadeIn" style={{animation: 'fadeIn 0.5s ease-in-out forwards'}}>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
					<div>
						<h1 className="text-2xl font-bold">
							Dashboard
						</h1>
						<p className="mt-1" >
							Welcome back! Here's what's happening with your business.
						</p>
					</div>
					{/* Date Range Picker */}
					<div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
						<div className="flex flex-col">
							<label htmlFor="from-date" className="text-xs font-medium mb-1">
								From Date
							</label>
							<div className="relative">
								<input
									id         = "from-date"
									type       = "date"
									value      = {fromDate}
									onChange   = {(e) => setFromDate(e.target.value)}
									className  = "px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-200"
									style={{
										backgroundColor: '#ffffff',
										borderColor: '#d1d5db',
										'--tw-ring-color': theme.primaryGradientStart || '#3b82f6'
									}}
								/>
							</div>
						</div>
						<div className="flex flex-col">
							<label htmlFor="to-date" className="text-xs font-medium mb-1">
								To Date
							</label>
							<div className="relative">
								<input
									id         = "to-date"
									type       = "date"
									value      = {toDate}
									onChange   = {(e) => setToDate(e.target.value)}
									className  = "px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all duration-200"
									style={{
										backgroundColor:'#ffffff',
										borderColor:'#d1d5db',
										'--tw-ring-color': theme.primaryGradientStart || '#3b82f6'
									}}
								/>
							</div>
						</div>
						<div className="flex items-end">
							<ThemeUI.Button
								type           = "button"
								onClick        = {fetchAllData}
								disabled       = {loading || chartLoading}
								gradientColors = {{
									start: theme.primaryGradientStart,
									end: theme.primaryGradientEnd,
								}}
								direction      = {theme.gradientDirection}
								className      = "w-full sm:w-auto px-4 md:px-6 py-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
							>
								<RefreshCw className={`h-4 w-4 mr-1 ${(loading || chartLoading) ? 'animate-spin' : ''}`} />
								Refresh
							</ThemeUI.Button>
						</div>
					</div>
				</div>
				{/* Counter Boxes Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
					{counterConfig.map((counter, index) => {
						const IconComponent = counter.icon;
						const counterData   = dashboardData?.[counter.dataKey];
						const change        = counterData?.change || 0;
						const changeType    = counterData?.changeType || 'neutral';
						return(
							<div key={counter.id} 
								 className="rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 cursor-pointer group transform hover:scale-105"
								 style={{ 
									backgroundColor : '#ffffff',
									borderColor     : '#e5e7eb',
									animationDelay  : `${index * 0.1}s`,
									animation       : 'slideUp 0.6s ease-out forwards'
								 }}
								 onClick={() => counter.route && navigate(counter.route)}
								 >
								<div className="p-4">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium group-hover:text-gray-800 transition-colors truncate">
												{counter.title}
											</p>
											<p className="text-lg font-bold mt-1 transition-all duration-200">
												{getDisplayValue(counter, dashboardData)}
											</p>
											{counter.dataKey !== 'liveRides' && (
												<div className="flex items-center mt-1">
													<span className={`text-xs font-medium transition-all duration-200 ${
														changeType === 'positive' ? 'text-green-600' : 
														changeType === 'negative' ? 'text-red-600' : 
														'text-gray-500'
													}`}>
														{formatChange(change)}
													</span>
													<span className="text-xs ml-1">
														vs last period
													</span>
												</div>
											)}
										</div>
										<div className={`${counter.color} p-2 rounded-lg ml-2 flex-shrink-0 transition-all duration-300 group-hover:scale-110`}>
											<IconComponent className="h-4 w-4 text-white" />
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
				{/* Driver Live Locations Chart */}
				<DriverLocationChart />
				{/* Completed Rides Chart */}
				<div className="rounded-lg shadow-sm border mb-6 transition-all duration-300 hover:shadow-md"
					style={{ backgroundColor: '#ffffff',borderColor:'#e5e7eb'}}>
					<div className="p-4 border-gray-200 border-b">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center mb-4 sm:mb-0">
								<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110"
									style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
									<Activity className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Completed Rides
									</h2>
									<p className="text-sm">
										Daily completed rides over selected period
									</p>
								</div>
							</div>
							{/* View Details Link */}
							<div className="flex items-center space-x-2">
								<a
									href="#"
									onClick={handleViewDetails}
									className="flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 rounded-md"
									style={{ color: theme.primaryGradientStart || '#3b82f6' }}>
									<ExternalLink className="h-4 w-4 mr-1" />
									View Details
								</a>
							</div>
						</div>
					</div>
					{/* Chart Content */}
					<div className="p-6">
						{chartLoading ? (
							<LoadingComponent message="Loading chart data..." />
						) : chartError ? (
							<ErrorComponent 
								title="Chart Error"
								message={chartError}
								onRetry={fetchChartData}
							/>
						) : chartData.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
								<Calendar className="h-12 w-12 mb-4 opacity-50" />
								<p className="text-lg font-medium">No data available</p>
								<p className="text-sm">No completed rides found for the selected period</p>
							</div>
						) : (
							<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
											<defs>
												<linearGradient id="completedRidesGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={theme.primaryGradientStart} stopOpacity={0.8}/>
													<stop offset="95%" stopColor={theme.primaryGradientEnd} stopOpacity={0.1}/>
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3"/>
											<XAxis 
												dataKey="date" 
												tick={{ fontSize: 12, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<YAxis 
												tick={{ fontSize: 12, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<Tooltip />
											<Area
												type="monotone"
												dataKey="completedRides"
												stroke={theme.primaryGradientStart}
												strokeWidth={2}
												fill="url(#completedRidesGradient)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
								{/* Chart Summary */}
								<div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-gray-200 border-t">
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm">
											Most Active Day
										</p>
										<p className="text-lg font-semibold">
											{(() => {
												const maxRides = Math.max(...chartData.map(item => item.completedRides));
												const mostActiveDay = chartData.find(item => item.completedRides === maxRides);
												return mostActiveDay ? mostActiveDay.date : 'N/A';
											})()}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm">
											Daily Average
										</p>
										<p className="text-lg font-semibold">
											{Math.round(chartData.reduce((sum, item) => sum + item.completedRides, 0) / chartData.length || 0).toLocaleString()}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm">
											Peak Day Rides
										</p>
										<p className="text-lg font-semibold">
											{Math.max(...chartData.map(item => item.completedRides)).toLocaleString()}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
				{/* Payment Type and Ride Status Charts Row */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
					{/* Payment Type Distribution Chart */}
					<div className="rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md" 
						style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
						<div className="p-4 border-gray-200 border-b">
							<div className="flex items-center">
								<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110" 
									style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
									<CreditCard className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Payment Methods
									</h2>
									<p className="text-sm">
										Distribution by transaction volume
									</p>
								</div>
							</div>
						</div>
						{/* Payment Chart Content */}
						<div className="p-6">
							{paymentTypeLoading ? (
								<LoadingComponent message="Loading payment data..." />
							) : paymentTypeError ? (
								<ErrorComponent 
									title="Payment Chart Error"
									message={paymentTypeError}
									onRetry={fetchPaymentTypeData}
								/>
							) : paymentTypeData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
									<CreditCard className="h-12 w-12 mb-4 opacity-50" />
									<p className="text-lg font-medium">No payment data available</p>
									<p className="text-sm">No paid transactions found</p>
								</div>
							) : (
								<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
									<div className="h-64 relative">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={paymentTypeData || []}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={({ percentage }) => {
														if (percentage < 8) return null;
														return `${(percentage || 0).toFixed(1)}%`;
													}}
													outerRadius={80}
													innerRadius={30}
													fill="#8884d8"
													dataKey="value"
													stroke="#ffffff"
													strokeWidth={2}
												>
													{(paymentTypeData || []).map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry?.color || '#6b7280'} />
													))}
												</Pie>
												<Tooltip/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									{/* Payment Legend */}
									<div className="mt-4 grid grid-cols-2 gap-3">
										{paymentTypeData.map((entry, index) => (
											<div key={index} className="flex items-center">
												<div 
													className="w-3 h-3 rounded mr-2 flex-shrink-0" 
													style={{ backgroundColor: entry.color }}
												/>
												<div className="flex-1 min-w-0">
													<span className="text-sm font-medium truncate">{entry.name}</span>
													<div className="text-xs text-gray-500">
														{entry.formattedValue} ({entry.percentage}%)
													</div>
												</div>
											</div>
										))}
									</div>
									{/* Payment Summary Stats */}
									<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-gray-200 border-t">
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">Most Used Payment</p>
											<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart }}>
												{paymentTypeData[0]?.name || 'N/A'}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">Digital Payments</p>
											<p className="text-lg font-semibold">
												{(() => {
													const digitalPercent = paymentTypeData
														.filter(item => ['Card', 'Wallet', 'UPI'].includes(item.name))
														.reduce((sum, item) => sum + item.percentage, 0);
													return `${digitalPercent.toFixed(1)}%`;
												})()}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">Cash Payments</p>
											<p className="text-lg font-semibold">
												{paymentTypeData.find(item => item.name === 'Cash')?.percentage?.toFixed(1) || 0}%
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">Total Transactions</p>
											<p className="text-lg font-semibold text-gray-900">
												{paymentTypeData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-IN')}
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
					{/* Ride Status Distribution Chart */}
					<div className="rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md" 
						style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
						<div className="p-4 border-gray-200 border-b">
							<div className="flex items-center">
								<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110" 
									style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
									<Activity className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Ride Status Distribution
									</h2>
									<p className="text-sm">
										Breakdown of rides by completion status
									</p>
								</div>
							</div>
						</div>
						{/* Status Chart Content */}
						<div className="p-6">
							{rideStatusLoading ? (
								<LoadingComponent message="Loading status data..." />
							) : rideStatusError ? (
								<ErrorComponent 
									title="Status Chart Error"
									message={rideStatusError}
									onRetry={fetchRideStatusData}
								/>
							) : rideStatusData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
									<Activity className="h-12 w-12 mb-4 opacity-50" />
									<p className="text-lg font-medium">No data available</p>
									<p className="text-sm">No rides found for the selected period</p>
								</div>
							) : (
								<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
									<div className="h-64 relative">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={rideStatusData || []}
													cx="50%"
													cy="50%"
													labelLine={false}
													label={({ percentage }) => {
														if (percentage < 8) return null;
														return `${(percentage || 0).toFixed(1)}%`;
													}}
													outerRadius={80}
													innerRadius={30}
													fill="#8884d8"
													dataKey="value"
													stroke="#ffffff"
													strokeWidth={2}
												>
													{(rideStatusData || []).map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry?.color || '#6b7280'} />
													))}
												</Pie>
												<Tooltip/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									{/* Status Legend */}
									<div className="mt-4 grid grid-cols-2 gap-3">
										{rideStatusData.map((entry, index) => (
											<div key={index} className="flex items-center">
												<div 
													className="w-3 h-3 rounded mr-2 flex-shrink-0" 
													style={{ backgroundColor: entry.color }}
												/>
												<div className="flex-1 min-w-0">
													<span className="text-sm font-medium truncate">{entry.name}</span>
													<div className="text-xs text-gray-500">
														{entry.value.toLocaleString('en-IN')} ({entry.percentage}%)
													</div>
												</div>
											</div>
										))}
									</div>
									{/* Status Summary Stats - Now properly inside the chart container and following structure */}
									<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-gray-200 border-t">
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">
												Total Rides
											</p>
											<p className="text-lg font-semibold text-gray-900">
												{rideStatusData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-IN')}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">
												Completion Rate
											</p>
											<p className="text-lg font-semibold text-green-600">
												{(() => {
													const completed = rideStatusData.find(item => item.name === 'Completed')?.value || 0;
													const total = rideStatusData.reduce((sum, item) => sum + item.value, 0);
													return total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : '0%';
												})()}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">
												Cancellation Rate
											</p>
											<p className="text-lg font-semibold text-red-500">
												{(() => {
													const cancelled = rideStatusData
														.filter(item => item.name.includes('Cancelled'))
														.reduce((sum, item) => sum + item.value, 0);
													const total = rideStatusData.reduce((sum, item) => sum + item.value, 0);
													return total > 0 ? `${((cancelled / total) * 100).toFixed(1)}%` : '0%';
												})()}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-sm text-gray-600">
												Active/Ongoing
											</p>
											<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart }}>
												{(rideStatusData.find(item => item.name === 'Ongoing')?.value || 0).toLocaleString('en-IN')}
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				{/* Revenue Analysis Chart */}
				<div className="rounded-lg shadow-sm border mb-6 transition-all duration-300 hover:shadow-md"
					style={{ backgroundColor: '#ffffff', borderColor:'#e5e7eb'}}>
					<div className="p-4 border-gray-200 border-b">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center mb-4 sm:mb-0">
								<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110" style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
									<TrendingUp className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Revenue Breakdown
									</h2>
									<p className="text-sm">
										Daily revenue breakdown: Total Fare, Commission & Driver Payouts
									</p>
								</div>
							</div>
						</div>
					</div>
					{/* Revenue Chart Content */}
					<div className="p-6">
						{revenueLoading ? (
							<LoadingComponent message="Loading revenue data..." />
						) : revenueError ? (
							<ErrorComponent 
								title="Revenue Chart Error"
								message={revenueError}
								onRetry={fetchRevenueData}
							/>
						) : revenueData.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
								<DollarSign className="h-12 w-12 mb-4 opacity-50" />
								<p className="text-lg font-medium">No revenue data available</p>
								<p className="text-sm">No paid rides found for the selected period</p>
							</div>
						) : (
							<div className="transition-opacity duration-500 opacity-0" 
								style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
								{/* Legend */}
								<div className="flex flex-wrap justify-center gap-6">
									<div className="flex items-center">
										<div className="w-4 h-4 rounded mr-2" style={{
											background: `linear-gradient(135deg, ${theme.primaryGradientStart || '#3b82f6'}, ${theme.primaryGradientEnd || '#1d4ed8'})`
										}}></div>
										<span className="text-sm font-medium">Total Fare Revenue</span>
									</div>
									<div className="flex items-center">
										<div className="w-4 h-4 rounded mr-2" style={{
											background: `linear-gradient(135deg, ${theme.secondaryGradientStart || '#f59e0b'}, ${theme.secondaryGradientEnd || '#d97706'})`
										}}></div>
										<span className="text-sm font-medium">Commission</span>
									</div>
									<div className="flex items-center">
										<div className="w-4 h-4 rounded mr-2" style={{
											background: `linear-gradient(135deg, #10b981, #059669)`
										}}></div>
										<span className="text-sm font-medium">Driver Payout</span>
									</div>
								</div>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
											<defs>
												<linearGradient id="totalRevenueBarGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={theme.primaryGradientStart || '#3b82f6'} stopOpacity={0.9}/>
													<stop offset="95%" stopColor={theme.primaryGradientEnd || '#1d4ed8'} stopOpacity={0.7}/>
												</linearGradient>
												<linearGradient id="commissionBarGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={theme.secondaryGradientStart || '#f59e0b'} stopOpacity={0.9}/>
													<stop offset="95%" stopColor={theme.secondaryGradientEnd || '#d97706'} stopOpacity={0.7}/>
												</linearGradient>
												<linearGradient id="driverPayoutBarGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
													<stop offset="95%" stopColor="#059669" stopOpacity={0.7}/>
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3"/>
											<XAxis 
												dataKey="date" 
												tick={{ fontSize: 12, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<YAxis 
												tick={{ fontSize: 12, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
												tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
											/>
											<Tooltip/>
											<Bar 
												dataKey="totalRevenue" 
												name="Total Fare Revenue"
												fill="url(#totalRevenueBarGradient)"
												radius={[4, 4, 0, 0]}
												maxBarSize={40}
											/>
											<Bar 
												dataKey="commission" 
												name="Commission"
												fill="url(#commissionBarGradient)" 
												radius={[4, 4, 0, 0]}
												maxBarSize={40}
											/>
											<Bar 
												dataKey="driverPayout" 
												name="Driver Payout"
												fill="url(#driverPayoutBarGradient)" 
												radius={[4, 4, 0, 0]}
												maxBarSize={40}
											/>
										</ComposedChart>
									</ResponsiveContainer>
								</div>
								{/* Revenue Summary */}
								<div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2 border-gray-200 border-t">
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm text-gray-600">
											Peak Revenue Day
										</p>
										<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart || '#3b82f6' }}>
											{(() => {
												const maxRevenue = Math.max(...revenueData.map(item => item.totalRevenue));
												const peakDay    = revenueData.find(item => item.totalRevenue === maxRevenue);
												return peakDay ? peakDay.date : 'N/A';
											})()}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm text-gray-600">
											Peak Revenue Amount
										</p>
										<p className="text-lg font-semibold" style={{ color: theme.primaryGradientEnd || '#1d4ed8' }}>
											₹{Math.max(...revenueData.map(item => item.totalRevenue)).toLocaleString('en-IN')}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm text-gray-600">
											Daily Average
										</p>
										<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart || '#3b82f6' }}>
											₹{Math.round(revenueData.reduce((sum, item) => sum + item.totalRevenue, 0) / revenueData.length || 0).toLocaleString('en-IN')}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm text-gray-600">
											Total Commission
										</p>
										<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart || '#f59e0b' }}>
											₹{revenueData.reduce((sum, item) => sum + item.commission, 0).toLocaleString('en-IN')}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-sm text-gray-600">
											Total Driver Payouts
										</p>
										<p className="text-lg font-semibold" style={{ color: '#10b981' }}>
											₹{revenueData.reduce((sum, item) => sum + item.driverPayout, 0).toLocaleString('en-IN')}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
				{/* Top Ranking drivers and Top Locations Charts Row */}
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
					{/* Top Ranking Drivers */}
					<div className="rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md" 
						style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
						<div className="p-4 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center">
									<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110"
										style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
										<Trophy className="h-5 w-5 text-white" />
									</div>
									<div>
										<h2 className="text-lg font-semibold text-gray-800">Top 3 Ranking Drivers</h2>
										<p className="text-sm text-gray-600">40% trips + 60% rating weighted score</p>
									</div>
								</div>
								<div className="text-right">
									<p className="text-xs text-gray-500">Performance Score</p>
									<p className="text-sm font-medium text-gray-700">Out of 100%</p>
								</div>
							</div>
						</div>
						{/* Ranking Chart Content */}
						<div className="p-6">
							{topDriversLoading ? (
								<LoadingComponent message="Loading locations data..." />
							) : topDriversError ? (
								<ErrorComponent 
									title="Locations Error"
									message={topDriversError}
									onRetry={fetchTopDriversData}
								/>
							) : topDriversData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
									<MapPin className="h-12 w-12 mb-4 opacity-50" />
									<p className="text-lg font-medium">No location data</p>
									<p className="text-sm">No rides found for any locations</p>
								</div>
							) : (
								<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={topDriversData}
											margin={{ top: 35, right: 30, left: 20, bottom: 20 }}
										>
											<defs>
												<linearGradient id="goldBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
													<stop offset="0%" stopColor="#FCD34D" />
													<stop offset="50%" stopColor="#F59E0B" />
													<stop offset="100%" stopColor="#D97706" />
												</linearGradient>
												<linearGradient id="silverBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
													<stop offset="0%" stopColor="#F9FAFB" />
													<stop offset="50%" stopColor="#D1D5DB" />
													<stop offset="100%" stopColor="#9CA3AF" />
												</linearGradient>
												<linearGradient id="bronzeBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
													<stop offset="0%" stopColor="#FED7AA" />
													<stop offset="50%" stopColor="#FB923C" />
													<stop offset="100%" stopColor="#EA580C" />
												</linearGradient>
												<linearGradient id="blueBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
													<stop offset="0%" stopColor="#DBEAFE" />
													<stop offset="50%" stopColor="#60A5FA" />
													<stop offset="100%" stopColor="#3B82F6" />
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3" opacity={0.3} />
											<XAxis 
												dataKey="name"
												tick={{ fontSize: 11, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
												angle={-45}
												textAnchor="end"
												height={60}
											/>
											<YAxis 
												domain={[0, 100]}
												tick={{ fontSize: 11, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
												label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
											/>
											<Tooltip />
											<Bar 
											dataKey="score" 
											radius={[4, 4, 0, 0]}
											maxBarSize={80}
											>
												{topDriversData.map((entry, index) => {
													const getBarGradient = (index) => {
													const gradients = [
														'url(#goldBarGradient)',    // 1st place
														'url(#silverBarGradient)',  // 2nd place
														'url(#bronzeBarGradient)',  // 3rd place
													];
													return gradients[index] || 'url(#blueBarGradient)'; // 4th+ place
													};
													return (
													<Cell 
														key={`cell-${index}`} 
														fill={getBarGradient(index)}
													/>
													);
												})}
												<LabelList content={RankingBadge} />
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
								{/* Summary Statistics */}
								<div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
									<div className="text-center transition-all duration-300 hover:scale-105">
										<div className="flex items-center justify-center mb-2">
											<Trophy className="h-4 w-4 mr-1" style={{ color: theme.primaryGradientStart || '#3b82f6' }}/>
											<span className="text-xs text-gray-600">Champion</span>
										</div>
										<p className="text-sm font-semibold text-gray-800 truncate">
											{topDriversData[0]?.name || 'N/A'}
										</p>
										<p className="text-xs text-gray-500">{topDriversData[0]?.score}% score</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<div className="flex items-center justify-center mb-2">
											<span className="text-xs text-gray-600">Avg Trips</span>
										</div>
										<p className="text-sm font-semibold text-gray-800">
											{Math.round(topDriversData.reduce((sum, d) => sum + d.trips, 0) / topDriversData.length || 0)}
										</p>
										<p className="text-xs text-gray-500">per driver</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<div className="flex items-center justify-center mb-2">
											<span className="text-xs text-gray-600">Avg Rating</span>
										</div>
										<p className="text-sm font-semibold text-gray-800">
											{(topDriversData.reduce((sum, d) => sum + d.rating, 0) / topDriversData.length || 0).toFixed(1)}
										</p>
										<p className="text-xs text-gray-500">out of 5.0</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<div className="flex items-center justify-center mb-2">
											<span className="text-xs text-gray-600">Total Earnings</span>
										</div>
										<p className="text-sm font-semibold text-gray-800">
											₹{(topDriversData.reduce((sum, d) => sum + d.earnings, 0) / 1000).toFixed(0)}K
										</p>
										<p className="text-xs text-gray-500">combined</p>
									</div>
								</div>
								</div>
							)}
						</div>
					</div>
					{/* Top Locations by Rides Chart */}
					<div className="rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md" 
						style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
						<div className="p-4 border-gray-200 border-b">
							<div className="flex items-center">
								<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110" 
									style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart || '#f59e0b'}, ${theme.primaryGradientEnd || '#d97706'})` }}>
									<MapPin className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Top Districts by Rides
									</h2>
									<p className="text-sm">
										Ride distribution across districts
									</p>
								</div>
							</div>
						</div>
						{/* Top Locations Chart Content */}
						<div className="p-6">
							{topLocationsLoading ? (
								<LoadingComponent message="Loading locations data..." />
							) : topLocationsError ? (
								<ErrorComponent 
									title="Locations Error"
									message={topLocationsError}
									onRetry={fetchTopLocationsData}
								/>
							) : topLocationsData.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
									<MapPin className="h-12 w-12 mb-4 opacity-50" />
									<p className="text-lg font-medium">No location data</p>
									<p className="text-sm">No rides found for any locations</p>
								</div>
							) : (
								<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
									<div className="h-80">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart 
												data={topLocationsData} 
												margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
											>
												<defs>
													<linearGradient id="locationBarGradient" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor={theme.primaryGradientStart || '#f59e0b'} stopOpacity={0.9}/>
														<stop offset="95%" stopColor={theme.primaryGradientStart || '#d97706'} stopOpacity={0.7}/>
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="3 3"/>
												<XAxis 
													dataKey="location"
													angle={-45}
													textAnchor="end"
													height={40}
													tick={{ fontSize: 10, fill: '#666' }}
													axisLine={{ stroke: '#e0e0e0' }}
													interval={0}
												/>
												<YAxis 
													tick={{ fontSize: 11, fill: '#666' }}
													axisLine={{ stroke: '#e0e0e0' }}
												/>
												<Tooltip />
												<Bar 
													dataKey="totalRides" 
													name="Total Rides"
													fill="url(#locationBarGradient)"
													radius={[4, 4, 0, 0]}
													maxBarSize={60}
												/>
											</BarChart>
										</ResponsiveContainer>
									</div>
									{/* Top Locations Summary */}
									<div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-gray-200 border-t">
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-xs text-gray-600">Top District</p>
											<p className="text-sm font-semibold">
												{topLocationsData[0]?.location || 'N/A'}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-xs text-gray-600">Market Share</p>
											<p className="text-lg font-semibold">
												{topLocationsData[0]?.marketShare || 0}%
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-xs text-gray-600">Total Districts</p>
											<p className="text-lg font-semibold">
												{topLocationsData.length}
											</p>
										</div>
										<div className="text-center transition-all duration-300 hover:scale-105">
											<p className="text-xs text-gray-600">Avg Completion</p>
											<p className="text-lg font-semibold text-green-600">
												{topLocationsData.length > 0 ? 
													(topLocationsData.reduce((sum, item) => sum + (item.completionRate || 0), 0) / topLocationsData.length).toFixed(1)
													: 0}%
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				
				{/* Driver Supply vs Passenger Demand Chart */}
				<div className="rounded-lg shadow-sm border transition-all duration-300 hover:shadow-md" 
					style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}>
					<div className="p-4 border-gray-200 border-b">
						<div className="flex items-center">
							<div className="p-2 rounded-lg mr-3 transition-all duration-300 hover:scale-110" 
								style={{ background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
								<TrendingDown className="h-5 w-5 text-white" />
							</div>
							<div>
								<h2 className="text-lg font-semibold">
									Supply vs Demand
								</h2>
								<p className="text-sm">
									Driver availability vs ride requests
								</p>
							</div>
						</div>
					</div>
					{/* Supply Demand Chart Content */}
					<div className="p-6">
						{supplyDemandLoading ? (
							<LoadingComponent message="Loading supply demand data..." />
						) : supplyDemandError ? (
							<ErrorComponent 
								title="Supply Demand Error"
								message={supplyDemandError}
								onRetry={fetchSupplyDemandData}
							/>
						) : supplyDemandData.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-64 transition-opacity duration-300">
								<TrendingDown className="h-12 w-12 mb-4 opacity-50" />
								<p className="text-lg font-medium">No supply demand data</p>
								<p className="text-sm">No data available for the selected period</p>
							</div>
						) : (
							<div className="transition-opacity duration-500 opacity-0" style={{animation: 'fadeIn 0.5s ease-in-out 0.2s forwards'}}>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart data={supplyDemandData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
											<defs>
												<linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={theme.primaryGradientStart} stopOpacity={0.8}/>
													<stop offset="95%" stopColor={theme.primaryGradientStart} stopOpacity={0.1}/>
												</linearGradient>
												<linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
													<stop offset="5%" stopColor={theme.secondaryGradientStart || '#f59e0b'} stopOpacity={0.8}/>
													<stop offset="95%" stopColor={theme.secondaryGradientEnd || '#d97706'} stopOpacity={0.1}/>
												</linearGradient>
											</defs>
											<CartesianGrid strokeDasharray="3 3"/>
											<XAxis 
												dataKey="date" 
												tick={{ fontSize: 11, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<YAxis 
												yAxisId="left"
												tick={{ fontSize: 11, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<YAxis 
												yAxisId="right"
												orientation="right"
												tick={{ fontSize: 11, fill: '#666' }}
												axisLine={{ stroke: '#e0e0e0' }}
											/>
											<Tooltip />
											<Area
												yAxisId="left"
												type="monotone"
												dataKey="totalRequests"
												name="Ride Requests"
												stroke={theme.secondaryGradientStart || '#f59e0b'}
												strokeWidth={2}
												fill="url(#demandGradient)"
											/>
											<Line
												yAxisId="right"
												type="monotone"
												dataKey="activeDrivers"
												name="Active Drivers"
												stroke={theme.primaryGradientStart}
												strokeWidth={3}
												dot={{ fill: theme.primaryGradientStart, strokeWidth: 2, r: 4 }}
											/>
										</ComposedChart>
									</ResponsiveContainer>
								</div>
								{/* Supply Demand Summary */}
								<div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-gray-200 border-t">
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-xs text-gray-600">Avg Supply Ratio</p>
										<p className="text-lg font-semibold" style={{ color: theme.primaryGradientStart }}>
											{(() => {
												const avgRatio = supplyDemandData.reduce((sum, item) => sum + (item.supplyDemandRatio || 0), 0) / supplyDemandData.length;
												return (avgRatio || 0).toFixed(2);
											})()}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-xs text-gray-600">Peak Demand</p>
										<p className="text-lg font-semibold">
											{Math.max(...supplyDemandData.map(item => item.totalRequests || 0))}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-xs text-gray-600">Max Drivers</p>
										<p className="text-lg font-semibold">
											{Math.max(...supplyDemandData.map(item => item.activeDrivers || 0))}
										</p>
									</div>
									<div className="text-center transition-all duration-300 hover:scale-105">
										<p className="text-xs text-gray-600">Supply Gaps</p>
										<p className="text-lg font-semibold">
											{supplyDemandData.reduce((sum, item) => sum + (item.supplyGap || 0), 0)}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
				{/* Data freshness indicator */}
				<div className="mt-6 text-right">
					<p className="text-xs text-gray-500">
						Data last updated: {new Date().toLocaleString('en-IN', {
							timeZone : 'Asia/Kolkata',
							day      : '2-digit',
							month    : '2-digit', 
							year     : 'numeric',
							hour     : '2-digit',
							minute   : '2-digit'
						})}
					</p>
				</div>
			</div>
			<style>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				@keyframes slideUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</Layout>
	);
}

export default Dashboard;