import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, ZoomIn, Wallet, DollarSign } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import Lightbox from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])

function Passenger(){
	const { theme } 										= useTheme()
	const [isModalOpen, setIsModalOpen] 					= useState(false)
	const [isWalletModalOpen, setIsWalletModalOpen] 		= useState(false)
	const [isLoading, setIsLoading] 						= useState(false)
	const [totalRows, setTotalRows] 						= useState(0)
	const [perPage, setPerPage] 							= useState(10)
	const [currentPage, setCurrentPage]						= useState(1)
	const [passengers, setPassengers] 						= useState([])
	const [searchQuery, setSearchQuery] 					= useState("")
	const [statusFilter, setStatusFilter] 					= useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors]					= useState({})
	const [editingPassenger, setEditingPassenger] 			= useState(null)
	const [selectedPassengerForWallet, setSelectedPassengerForWallet] = useState(null)
	const [formData, setFormData] 							= useState({
		name												: "",
		email												: "",
		mobile												: "",
		gender												: "Male",
		profile												: "",
		status												: 1,
	})
	const [walletFormData, setWalletFormData] 				= useState({
		amount: "",
		type: "credit",
		reference_type: "penalty",
		description: "",
	})
	const [placeholder, setPlaceholder] 					= useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] 			= useState(0)
	const [currentCharIndex, setCurrentCharIndex] 			= useState(0)
	const [isDeleting, setIsDeleting] 						= useState(false)
	const [lightboxOpen, setLightboxOpen] 					= useState(false)
	const [selectedProfile, setSelectedProfile] 			= useState([])
	const [profilePreview, setProfilePreview] 				= useState("")
	const words 											= ["name", "email", "mobile", "status"]

	// Initialize permissions with safe defaults
	const [passengerPermissions, setPassengerPermissions]   = useState({
		can_add                                             : false,
		can_edit                                            : false,
		can_delete                                          : false,
		can_view                                            : false
	})

	// Get user permissions for the passenger module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.passenger){
					return {
						can_add     : permissions.passenger.can_add || false,
						can_edit    : permissions.passenger.can_edit || false,
						can_delete  : permissions.passenger.can_delete || false,
						can_view    : permissions.passenger.can_view || false
					}
				}
			}
			return{
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return {
				can_add         : false,
				can_edit        : false,
				can_delete      : false,
				can_view        : false
			}
		}
	}, [])
		
	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setPassengerPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setPassengerPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch passengers on mount and when pagination/search/filter changes
	useEffect(() => {
		fetchPassengers(currentPage, perPage, searchQuery, statusFilter)
	}, [currentPage, perPage, searchQuery, statusFilter])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime   = 1500
		const timeout 	  = setTimeout(() => {
		const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){
				setPlaceholder(
				`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`
				)
				setCurrentCharIndex((prev) => prev + 1)
			}else 
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(
				`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`
				)
				setCurrentCharIndex((prev) => prev - 1)
			}else 
			if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else
			if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Memoized fetch function
	const fetchPassengers = useCallback(async () => {
		setIsLoading(true)
		try{
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/passenger`,{
					params: {
						page: currentPage,
						limit: perPage,
						search: searchQuery,
						status: statusFilter === "all" ? "" : statusFilter,
					},
				}
			)
			if(response.data.success){
				setPassengers(response.data.data.passengers)
				setTotalRows(response.data.data.pagination.total_records || 0)
			}else{
				toast.error("Failed to fetch passengers")
				setPassengers([])
				setTotalRows(0)
			}
		}catch(err){
			console.error("Error fetching passengers:", err)
			toast.error(err.response?.data?.message || "Failed to fetch passengers")
			setPassengers([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter])

	// Handle input change
	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: value
		}))
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
	}

	// Handle wallet input change
	const handleWalletInputChange = (e) => {
		const { name, value } = e.target
		setWalletFormData((prev) => ({
			...prev,
			[name]: value
		}))
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
	}

	// Handle file change
	const handleFileChange = (e) => {
		const file = e.target.files[0]
		if(file){
			setFormData((prev) => ({
				...prev,
				profile: file,
			}))
			const reader  = new FileReader()
			reader.onload = (e) => {
				setProfilePreview(e.target.result)
			}
			reader.readAsDataURL(file)
		}
		setBackendErrors((prev) => ({ ...prev, profile: "" }))
	}

	// Handle delete image
	const handleDeleteImage = (fieldName) => {
		setFormData((prev) => ({
			...prev,
			[fieldName]: ""
		}))
		setProfilePreview("")
		const fileInput = document.getElementById(fieldName)
		if(fileInput){
			fileInput.value = ""
		}
	}

	// Handle edit passenger
	const handleEditClick = (passenger) => {
		setEditingPassenger(passenger)
		setFormData({
			name	: passenger.name || "",
			email	: passenger.email || "",
			mobile	: passenger.mobile || "",
			gender	: passenger.gender || "Male",
			profile : "",
			status	: passenger.status == 1 ? 1 : 0
		})
		setProfilePreview(passenger.profile || "")
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle wallet click
	const handleWalletClick = (passenger) => {
		setSelectedPassengerForWallet(passenger)
		setWalletFormData({
			amount: "",
			type: "debit",
			reference_type: "penalty",
			description: "",
		})
		setBackendErrors({})
		setIsWalletModalOpen(true)
	}

	// Handle status change
	const handleStatusChange = (selectedOption) => {
		if(selectedOption){
			setFormData((prev) => ({
				...prev,
				status: selectedOption.value,
			}))
		}
		setBackendErrors((prev) => ({ ...prev, status: "" }))
	}

	// Handle gender change
	const handleGenderChange = (selectedOption) => {
		if(selectedOption){
			setFormData((prev) => ({
				...prev,
				gender: selectedOption.value,
			}))
		}
		setBackendErrors((prev) => ({ ...prev, gender: "" }))
	}

	// Handle wallet transaction type change
	const handleTransactionTypeChange = (selectedOption) => {
		if(selectedOption){
			setWalletFormData((prev) => ({
				...prev,
				type: selectedOption.value,
			}))
		}
		setBackendErrors((prev) => ({ ...prev, type: "" }))
	}

	// Handle wallet reference type change
	const handleReferenceTypeChange = (selectedOption) => {
		if(selectedOption){
			setWalletFormData((prev) => ({
				...prev,
				reference_type: selectedOption.value,
			}))
		}
		setBackendErrors((prev) => ({ ...prev, reference_type: "" }))
	}

	// Handle search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Handle pagination
	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	// Handle photo preview
	const handleProfileClick = (profileUrl) => {
		if(profileUrl){
			setSelectedProfile([{ src: profileUrl }])
			setLightboxOpen(true)
		}
	}

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		setBackendErrors({})
		try{
			const submitData = new FormData()
			submitData.append("name", formData.name)
			submitData.append("email", formData.email)
			submitData.append("mobile", formData.mobile)
			submitData.append("gender", formData.gender)
			submitData.append("status", formData.status)
			if(formData.profile instanceof File){
				submitData.append("profile", formData.profile)
			}
			const response = await axios.put(
				`${import.meta.env.VITE_API_URL}/admin/passenger/${editingPassenger.id}`,submitData,{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				}
			)
			if(response.data.success){
				toast.success(response.data.message || "Passenger updated successfully")
				setIsModalOpen(false)
				setEditingPassenger(null)
				setFormData({
					name: "",
					email: "",
					mobile: "",
					gender: "Male",
					profile: "",
					status: 1,
				})
				setProfilePreview("")
				fetchPassengers()
			}else{
				toast.error(response.data.message || "Failed to update passenger")
				if(response.data.errors){
					setBackendErrors(response.data.errors)
				}
			}
		}catch(err){
			console.error("Error updating passenger:", err)
			const errorMessage = err.response?.data?.message || "Failed to update passenger"
			toast.error(errorMessage)
			if(err.response?.data?.errors){
				setBackendErrors(err.response.data.errors)
			}
		}finally{
			setIsLoading(false)
		}
	}

	// Handle wallet transaction submission
	const handleWalletSubmit = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		setBackendErrors({})
		try{
			const response = await axios.post(
				`${import.meta.env.VITE_API_URL}/admin/passenger/${selectedPassengerForWallet.id}/wallet/transaction`,
				{
					amount: parseFloat(walletFormData.amount),
					type: walletFormData.type,
					reference_type: walletFormData.reference_type,
					description: walletFormData.description,
				}
			)
			if(response.data.success){
				toast.success(response.data.message || "Wallet transaction completed successfully")
				setIsWalletModalOpen(false)
				setSelectedPassengerForWallet(null)
				setWalletFormData({
					amount: "",
					type: "credit",
					reference_type: "penalty",
					description: "",
				})
				fetchPassengers()
			}else{
				toast.error(response.data.message || "Failed to process wallet transaction")
				if(response.data.errors){
					setBackendErrors(response.data.errors)
				}
			}
		}catch(err){
			console.error("Error processing wallet transaction:", err)
			const errorMessage = err.response?.data?.message || "Failed to process wallet transaction"
			toast.error(errorMessage)
			if(err.response?.data?.errors){
				setBackendErrors(err.response.data.errors)
			}
		}finally{
			setIsLoading(false)
		}
	}

	// Handle modal close
	const handleModalClose = () => {
		setIsModalOpen(false)
		setEditingPassenger(null)
		setFormData({
			name	: "",
			email	: "",
			mobile	: "",
			gender	: "Male",
			profile	: "",
			status	: 1,
		})
		setProfilePreview("")
		setBackendErrors({})
	}

	// Handle wallet modal close
	const handleWalletModalClose = () => {
		setIsWalletModalOpen(false)
		setSelectedPassengerForWallet(null)
		setWalletFormData({
			amount: "",
			type: "credit",
			reference_type: "penalty",
			description: "",
		})
		setBackendErrors({})
	}

	// Render passenger form
	const renderPassengerForm = () => (
		<form onSubmit={handleSubmit} className="space-y-6 p-4">
			<div className="grid md:grid-cols-4 gap-4">
				<ThemeUI.FormField
					label="Name"
					name="name"
					error={backendErrors.name}
					required
				>
					<ThemeUI.Input
						id="name"
						name="name"
						value={formData.name}
						onChange={handleInputChange}
						placeholder="Enter name"
						error={backendErrors.name}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Email"
					name="email"
					error={backendErrors.email}
					required
				>
					<ThemeUI.Input
						id="email"
						name="email"
						type="email"
						value={formData.email}
						onChange={handleInputChange}
						placeholder="Enter email"
						error={backendErrors.email}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Mobile"
					name="mobile"
					error={backendErrors.mobile}
					required
				>
					<div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed flex items-center justify-between">
						<span>{formData.mobile || "No mobile number provided"}</span>
						<span className="text-xs text-gray-500">🔒</span>
					</div>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Gender"
					name="gender"
					error={backendErrors.gender}
					required
				>
					<ThemeUI.Select
						id="gender"
						name="gender"
						value={formData.gender}
						onChange={handleGenderChange}
						options={[
						{ value: "Male", label: "Male" },
						{ value: "Female", label: "Female" },
						{ value: "Others", label: "Others" },
						]}
						placeholder="Select gender"
						error={backendErrors.gender}
						isSearchable={false}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Profile Photo"
					name="profile"
					error={backendErrors.profile}
				>
					<ThemeUI.FileInput
						id="profile"
						name="profile"
						onChange={handleFileChange}
						accept="image/png,image/jpeg,image/jpg"
						preview={profilePreview}
						onDelete={() => handleDeleteImage("profile")}
						error={backendErrors.profile}
						showDeleteIcon={false}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField
					label="Status"
					name="status"
					error={backendErrors.status}
					required
				>
					<ThemeUI.Select
						id="status"
						name="status"
						value={formData.status}
						onChange={handleStatusChange}
						options={[
						{ value: 1, label: "Active" },
						{ value: 0, label: "Inactive" },
						]}
						placeholder="Select status"
						error={backendErrors.status}
						isSearchable={false}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<ThemeUI.Button
					type="button"
					onClick={handleModalClose}
					variant="outline"
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					type="submit"
					disabled={isLoading}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					{isLoading && <Loader size={16} className="mr-2 animate-spin" />}
					Update Passenger
				</ThemeUI.Button>
			</div>
		</form>
	)

	// Render wallet transaction form
	const renderWalletForm = () => (
		<form onSubmit={handleWalletSubmit} className="space-y-6 p-4">
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
				<div className="flex items-center gap-2 mb-2">
					<DollarSign size={20} className="text-blue-600" />
					<h3 className="font-semibold text-blue-900">Passenger Details</h3>
				</div>
				<div className="text-sm text-gray-700 space-y-1">
					<p><span className="font-medium">Name:</span> {selectedPassengerForWallet?.name}</p>
					<p><span className="font-medium">Email:</span> {selectedPassengerForWallet?.email}</p>
					<p><span className="font-medium">Mobile:</span> {selectedPassengerForWallet?.mobile}</p>
				</div>
			</div>
			<div className="grid md:grid-cols-4 gap-4">
				<ThemeUI.FormField
					label="Transaction Type"
					name="type"
					error={backendErrors.type}
					required
				>
					<ThemeUI.Select
						id="type"
						name="type"
						value={walletFormData.type}
						onChange={handleTransactionTypeChange}
						options={[
							{ value: "credit", label: "Credit (Add Money)" },
							{ value: "debit", label: "Debit (Deduct Money)" },
						]}
						placeholder="Select transaction type"
						error={backendErrors.type}
						isSearchable={false}
					/>
				</ThemeUI.FormField>

				<ThemeUI.FormField
					label="Reference Type"
					name="reference_type"
					error={backendErrors.reference_type}
					required
				>
					<ThemeUI.Select
						id="reference_type"
						name="reference_type"
						value={walletFormData.reference_type}
						onChange={handleReferenceTypeChange}
						options={[
							{ value: "penalty", label: "Penalty" },
							{ value: "bonus", label: "Bonus" },
							{ value: "adjustment", label: "Adjustment" },
							{ value: "cashback", label: "Cashback" },
							{ value: "refund", label: "Refund" },
						]}
						placeholder="Select reference type"
						error={backendErrors.reference_type}
						isSearchable={false}
					/>
				</ThemeUI.FormField>

				<ThemeUI.FormField
					label="Amount"
					name="amount"
					error={backendErrors.amount}
					required
				>
					<ThemeUI.Input
						id="amount"
						name="amount"
						type="number"
						step="0.01"
						min="0"
						value={walletFormData.amount}
						onChange={handleWalletInputChange}
						placeholder="Enter amount"
						error={backendErrors.amount}
					/>
				</ThemeUI.FormField>

				<ThemeUI.FormField
					label="Description"
					name="description"
					error={backendErrors.description}
					required
				>
					<ThemeUI.Input
						id="description"
						name="description"
						value={walletFormData.description}
						onChange={handleWalletInputChange}
						placeholder="Enter description"
						error={backendErrors.description}
					/>
				</ThemeUI.FormField>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<ThemeUI.Button
					type="button"
					onClick={handleWalletModalClose}
					variant="outline"
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					type="submit"
					disabled={isLoading}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					{isLoading && <Loader size={16} className="mr-2 animate-spin" />}
					Process Transaction
				</ThemeUI.Button>
			</div>
		</form>
	)

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName : "S.No",
				valueGetter: (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
				width	   : 70,
				sortable   : false,
			},
			{
				headerName : "Name",
				field	   : "name",
				sortable   : true,
				minWidth   : 100,
				flex	   : 1,
			},
			{
				headerName : "Email",
				field	   : "email",
				sortable   : true,
				minWidth   : 250,
				flex       : 1,
			},
			{
				headerName : "Mobile",
				field	   : "mobile",
				sortable   : true,
				minWidth   : 180,
				flex       : 1,
			},
			{
				headerName : "Gender",
				field      : "gender",
				sortable   : true,
				minWidth   : 150,
				flex       : 1,
			},
			{
				headerName : "Profile",
				field      : "profile",
				cellRenderer: (params) => {
				const hasProfile = !!params.value
				return (
					<button
						onClick={() => hasProfile && handleProfileClick(params.value)}
						className={`p-1 transition-colors ${
							hasProfile
							? "text-blue-600 hover:text-blue-800 cursor-pointer"
							: "text-gray-400 cursor-not-allowed"
						}`}
						title={hasProfile ? "View Photo" : "No photo available"}
						disabled={!hasProfile}
					>
					<ZoomIn
						size={16}
						style={{
							color: hasProfile ? theme.primaryGradientStart : "#ccc",
						}}
					/>
					</button>
				)
				},
				minWidth: 150,
				flex: 1,
			},
			{
				headerName: "Status",
				field: "status",
				cellRenderer: (params) => {
				const isActive = params.value === 1
				return (
					<span
					className={`px-2 py-1 rounded-full text-xs ${
						isActive
						? "bg-green-100 text-green-800"
						: "bg-red-100 text-red-800"
					}`}
					>
					{isActive ? "Active" : "Inactive"}
					</span>
				)
				},
				minWidth: 150,
				flex: 1,
			},
		]
		// Only add Actions column if user has edit or delete permission
		if(passengerPermissions.can_edit || passengerPermissions.can_delete){
			baseColumns.push({
				headerName  : "Actions",
				field       : "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{passengerPermissions.can_edit && (
							<>
								<button
									onClick   = {() => handleEditClick(params.data)}
									className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
									title     = "Edit"
								>
									<Edit size={16} style={{ color: theme.primaryGradientStart }} />
								</button>
								<button
									onClick   = {() => handleWalletClick(params.data)}
									className = "p-1 text-green-600 hover:text-green-800 transition-colors"
									title     = "Manage Wallet"
								>
									<Wallet size={16} style={{ color: theme.primaryGradientStart }} />
								</button>
							</>
						)}
					</div>
				),
				minWidth    : 120,
				flex        : 0.5,
				sortable    : false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, passengerPermissions])

	return(
		<Layout>
			<div className="flex items-center mb-4 ">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Passenger</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
				<ol className="flex items-center">
					<li>
					<a
						href="/dashboard"
						className="hover:text-blue-600 transition-colors "
					>
						Home
					</a>
					</li>
					<li className="flex items-center">
					<ChevronRight className="h-4 w-4 mx-1" />
					</li>
					<li
					style={{ color: theme.primaryGradientStart }}
					className="font-medium"
					>
					Passenger
					</li>
				</ol>
				</nav>
			</div>
			<div className="mb-4 rounded-lg w-full ">
				<div className="flex justify-between items-center gap-2">
				<div className="w-full max-sm:flex-1 sm:w-1/3">
					<ThemeUI.Input
					id="search"
					name="search"
					value={searchQuery}
					className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
					onChange={handleSearchChange}
					placeholder={placeholder}
					leftElement={<Search size={16} className="text-gray-400" />}
					/>
				</div>
				<div className="flex flex-col sm:flex-row gap-2 w-full max-sm:w-fit sm:w-auto h-full">
					<ThemeUI.Button
					type="button"
					onClick={() => setIsFilterOffcanvasOpen(true)}
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					aria-label="Open filter options"
					>
					<Filter size={16} className="sm:mr-2 " />
					<p className="max-sm:hidden">Filters</p>
					</ThemeUI.Button>
				</div>
				</div>
			</div>
			<div style={{"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
				<AgGridReact
					className="custom-ag-grid"
					domLayout="autoHeight"
					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
						paginationPanelHeight: 50,
					})}
					defaultColDef={{
						resizable: false,
						suppressSizeToFit: false,
					}}
					rowData={passengers}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					paginationNumberFormatter={(params) => `${params.value}`}
					suppressCellFocus
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Passengers Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
						const newPage = params.api.paginationGetCurrentPage() + 1
						handlePageChange(newPage)
						}
					}}
				/>
			</div>
			{/* Edit Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				title="Edit Passenger"
				size="full"
			>
				{renderPassengerForm()}
			</Modal>
			{/* Wallet Transaction Modal */}
			<Modal
				isOpen={isWalletModalOpen}
				onClose={handleWalletModalClose}
				title="Wallet Transaction"
				size="full"
			>
				{renderWalletForm()}
			</Modal>
			{/* Filter Offcanvas */}
			<Offcanvas
				isOpen={isFilterOffcanvasOpen}
				onClose={() => setIsFilterOffcanvasOpen(false)}
				title="Filter Options"
				position="right"
				size="md"
			>
				<div className="space-y-4">
				<ThemeUI.FormField label="Status Filter">
					<ThemeUI.Select
					value={statusFilter}
					onChange={(selected) => {
						setStatusFilter(selected?.value || "")
						setCurrentPage(1)
					}}
					options={[
						{ value: "1", label: "Active" },
						{ value: "0", label: "Inactive" },
					]}
					placeholder="Filter by status"
					isClearable
					isSearchable={false}
					/>
				</ThemeUI.FormField>
				<div className="flex gap-2">
					<ThemeUI.Button
					type="button"
					onClick={() => {
						setStatusFilter("")
						setCurrentPage(1)
						setIsFilterOffcanvasOpen(false)
					}}
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					>
					Reset Filters
					</ThemeUI.Button>
				</div>
				</div>
			</Offcanvas>
			{/* Lightbox */}
			<Lightbox
				open={lightboxOpen}
				close={() => setLightboxOpen(false)}
				slides={selectedProfile}
			/>
		</Layout>
	)
}
export default Passenger
