import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route,Outlet} from 'react-router-dom';
import { ThemeProvider } from './context/themeContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Trips from './components/Trips';
import Vehicles from './components/Vehicles';
import VehicleTypes from './components/VehicleTypes';
import VehiclePrices from './components/VehiclePrices';
import Coupons from './components/Coupons';
import Drivers from './components/Drivers';
import Services from './components/Services';
import Sos from './components/Sos';
import Team from './components/Team';
import Notification from './components/Notification';
import Passenger from './components/Passenger';
import RideRequest from './components/RideRequest';
import Feedback from './components/Feedback';
import Permission from './components/Permission';
import Rankings from './components/Rankings';
import Role from './components/Role';
import Packages from './components/Packages';
import Earnings from './components/Earnings';
import Reservation from './components/Reservation';
import DriverDeposit from './components/DriverDeposit';
import AdvanceReservation from './components/AdvanceReservation';
import DeleteRequest from './components/DeleteRequest';
import CancellationPolicy from './components/CancellationPolicy';
import Unauthorized from './components/Unauthorized';
import CatComplaints from './components/CatComplaints';
import SubCatComplaints from './components/SubCatComplaints';
import Compliants from './components/Compliants';
import RideDetailsPage from './pages/RideDetailsPage';
import Subscriptions from './components/Subscriptions';
import MasterSettings from './components/MasterSettings';
import Licensing from './components/Licensing';

import Privacy from './components/Privacy';
import Terms from './components/Terms';
import Header from './components/Websites/Header.jsx';


import Pricing from "./pages/Websites/Pricing";
import Home from "./pages/Websites/Home";
import Demo from "./pages/Websites/Demo";
import Features from "./pages/Websites/Features";
import ScrollToTop from "./components/ScrollToTop";

// T parcel

import HeaderT from "./components/Websites/Tparcel/HeaderT.jsx"
import FeaturesT from "./pages/Websites/tparcel/FeaturesT.jsx"
import HomeT from "./pages/Websites/tparcel/HomeT.jsx"

const WebsiteLayout = () => {
	return(
		<>
			<Header />
			<Outlet />
		</>
	);
};
const TParcelLayout = () => {
    return(
        <>
            <HeaderT /> 
            <Outlet />
        </>
    );
};

function App(){
	return(
		<>
		<ScrollToTop />
    		<ThemeProvider>
				<ToastContainer
					position="top-right"
					autoClose={3000}
					hideProgressBar={false}
					newestOnTop
					closeOnClick
					rtl={false}
					pauseOnFocusLoss
					draggable
					pauseOnHover
					theme="light"
				/>
				<Routes>
					{/* --- GROUP 1: Main Website Pages (Uses Default Header) --- */}
					<Route element={<WebsiteLayout />}>
						{/* <Route path="/" element={
							<>
								<Hero />
								<FeatureShowcase />
								<FeaturesHome />
								<TechSection />
								<BusinessSection />
								<FinalSection />
							</>
						} /> */}
						<Route path="/" element={<Home />} />
						<Route path="/pricing" element={<Pricing />} />
						<Route path="/demo" element={<Demo />} />
						<Route path="/features" element={<Features />} />
					</Route>

					{/* --- GROUP 2: T-Parcel Pages (Uses HeaderT) --- */}
					<Route element={<TParcelLayout />}>
						{/* <Route path="/t-parcel" element={
							<>
								<HeroT />
								<FeatureShowcaseT />
								<FeaturesHomeT />
								<TechSectionT />
								<BusinessSectionT />
								<FinalSectionT />
							</>
						} /> */}
						<Route path="/t-parcel" element={<HomeT />} />
        				<Route path="/featuresT" element={<FeaturesT />} />
						
					</Route>
					
					{/* --- GROUP 3: Standalone Pages (No Header / Custom Header) --- */}
					<Route path="/signin" element={<SignIn />} />
					<Route path="/privacy" element={<Privacy />} />
					<Route path="/terms" element={<Terms />} />

					{/* Unauthorized Access Page */}
					<Route path="/unauthorized" element={<Unauthorized />} />

					{/* Protected Routes */}
					<Route 
						path="/dashboard" 
						element={
							<ProtectedRoute moduleName="dashboard">
								<Dashboard />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/settings" 
						element={
							<ProtectedRoute moduleName="settings">
								<Settings />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/trips" 
						element={
							<ProtectedRoute moduleName="trips">
								<Trips />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/vehicles" 
						element={
							<ProtectedRoute moduleName="vehicles">
								<Vehicles />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/vehicletypes" 
						element={
							<ProtectedRoute moduleName="vehicletypes">
								<VehicleTypes />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/vehicleprices" 
						element={
							<ProtectedRoute moduleName="vehicleprices">
								<VehiclePrices />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/coupons" 
						element={
							<ProtectedRoute moduleName="coupons">
								<Coupons />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/drivers" 
						element={
							<ProtectedRoute moduleName="drivers">
								<Drivers />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/services" 
						element={
							<ProtectedRoute moduleName="services">
								<Services />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/sos" 
						element={
							<ProtectedRoute moduleName="sos">
								<Sos />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/team" 
						element={
							<ProtectedRoute moduleName="team">
								<Team />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/notification" 
						element={
							<ProtectedRoute moduleName="notification">
								<Notification />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/passenger" 
						element={
							<ProtectedRoute moduleName="passenger">
								<Passenger />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/riderequest" 
						element={
							<ProtectedRoute moduleName="riderequest">
								<RideRequest />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/feedback" 
						element={
							<ProtectedRoute moduleName="feedback">
								<Feedback />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/permission" 
						element={
							<ProtectedRoute moduleName="permission">
								<Permission />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/rankings" 
						element={
							<ProtectedRoute moduleName="rankings">
								<Rankings />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/role" 
						element={
							<ProtectedRoute moduleName="role">
								<Role />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/packages" 
						element={
							<ProtectedRoute moduleName="packages">
								<Packages />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/earnings" 
						element={
							<ProtectedRoute moduleName="earnings">
								<Earnings />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/reservation" 
						element={
							<ProtectedRoute moduleName="reservation">
								<Reservation />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/driverdeposit" 
						element={
							<ProtectedRoute moduleName="driverdeposit">
								<DriverDeposit />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/advancereservation" 
						element={
							<ProtectedRoute moduleName="advancereservation">
								<AdvanceReservation />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/deleterequest" 
						element={
							<ProtectedRoute moduleName="deleterequest">
								<DeleteRequest />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/catcomplaints" 
						element={
							<ProtectedRoute moduleName="catcomplaints">
								<CatComplaints />
							</ProtectedRoute>
						} 
					/> 
					<Route 
						path="/subcatcomplaints" 
						element={
							<ProtectedRoute moduleName="subcatcomplaints">
								<SubCatComplaints />
							</ProtectedRoute>
						} 
					/>
					<Route 
						path="/complaints" 
						element={
							<ProtectedRoute moduleName="complaints">
								<Compliants />
							</ProtectedRoute>
						} 
					/> 
					<Route  
						path="/cancellationpolicy" 
						element={
							<ProtectedRoute moduleName="cancellationpolicy">
								<CancellationPolicy />
							</ProtectedRoute>
						} 
					/>  
					<Route  
						path="/subscriptions" 
						element={
							<ProtectedRoute moduleName="subscriptions">
								<Subscriptions />
							</ProtectedRoute>
						} 
					/> 
					<Route  
						path="/mastersettings" 
						element={
							<ProtectedRoute moduleName="mastersettings">
								<MasterSettings />
							</ProtectedRoute>
						} 
					/>
					<Route  
						path="/licensing" 
						element={
							<ProtectedRoute moduleName="licensing">
								<Licensing />
							</ProtectedRoute>
						} 
					/>
					{/* Other routes */}
					<Route 
						path="/ride/share/:shareToken" 
						element={
						<RideDetailsPage />} 
					/>
				</Routes>
			</ThemeProvider>
		</>
	);
}
export default App;