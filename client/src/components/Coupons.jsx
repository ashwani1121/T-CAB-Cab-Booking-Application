import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import DataTable from "react-data-table-component"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Trash2, Edit, Search, Filter, Plus, Clock} from "lucide-react"
import { format } from "date-fns"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import NoRowsOverlay from "./NoRowsOverlay"
import { themeQuartz } from "ag-grid-community"
function Coupons(){
	const { theme }                         = useTheme()
	const [coupons, setCoupons]             = useState([])
	const [isLoading, setIsLoading]         = useState(false)
	const [totalRows, setTotalRows]         = useState(0)
	const [perPage, setPerPage]             = useState(10)
	const [currentPage, setCurrentPage]     = useState(1)
	const [editingCoupon, setEditingCoupon] = useState(null)
	const [vehicleTypes, setVehicleTypes]   = useState([])
	const [formData, setFormData]           = useState({
		code                      : "",
		coupon_type               : "general",
		description               : "",
		special_message           : "",
		discount_type             : "percentage",
		discount_value            : "",
		max_discount              : "",
		min_order_value           : "",
		starts_at                 : "",
		expires_at                : "",
		usage_limit               : "",
		per_user_limit            : "1",
		vehicle_type_restrictions : "",
		is_public                 : undefined,
		status                    : 1,
	})
	const [backendErrors, setBackendErrors]                 = useState({})
	const [searchQuery, setSearchQuery]                     = useState("")
	const [statusFilter, setStatusFilter]                   = useState("all")
	const [couponTypeFilter, setCouponTypeFilter]           = useState("all")
	const [isModalOpen, setIsModalOpen]                      = useState(false)
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)

	// Initialize permissions with safe defaults
	const [couponsPermissions, setCouponsPermissions]         = useState({
		can_add                                                 : false,
		can_edit                                                : false,
		can_delete                                              : false,
		can_view                                                : false
	})

	// Get user permissions for the coupons module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.coupons){
					return {
						can_add     : permissions.coupons.can_add || false,
						can_edit    : permissions.coupons.can_edit || false,
						can_delete  : permissions.coupons.can_delete || false,
						can_view    : permissions.coupons.can_view || false
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
		setCouponsPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setCouponsPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Debounced fetch function
	const fetchCoupons = useCallback(
		async (page, rowsPerPage, search, status, couponType) => {
			setIsLoading(true)
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/coupons`,{
					params: {
						page,
						limit: rowsPerPage,
						search,
						status: status === "all" ? "" : status,
						coupon_type: couponType === "all" ? "" : couponType,
					},
				})
				setCoupons(response.data.data || [])
				setTotalRows(response.data.total || 0)
			}catch(err){
				toast.error("Failed to fetch coupons")
				console.error("fetchCoupons error:", err)
			}finally{
				setIsLoading(false)
			}
		},
		[]
	)

	// Fetch data with debouncing
	useEffect(() => {
		const handler = setTimeout(() => {
		fetchCoupons(
			currentPage,
			perPage,
			searchQuery,
			statusFilter,
			couponTypeFilter
		)
		}, 300)
		return () => clearTimeout(handler)
	}, [
		currentPage,
		perPage,
		searchQuery,
		statusFilter,
		couponTypeFilter,
		fetchCoupons,
	])

	useEffect(() => {
		const fetchVehicleTypes = async () => {
		try {
			const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/admin/vehicle-types`
			)
			setVehicleTypes(response.data.data || [])
		} catch (err) {
			toast.error("Failed to fetch vehicle types")
			console.error("fetchVehicleTypes error:", err)
		}
		}
		fetchVehicleTypes()
	}, [])

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}))
		if (backendErrors[name]) {
			setBackendErrors((prev) => ({ ...prev, [name]: "" }))
		}
	}

	const handleAddClick = () => {
		if(!couponsPermissions.can_add){
			toast.error("You don't have permission to create coupons")
			return
		}
		setEditingCoupon({ isNew: true })
		setFormData({
			code: "",
			coupon_type: "general",
			description: "",
			special_message: "",
			discount_type: "percentage",
			discount_value: "",
			max_discount: "",
			min_order_value: "",
			starts_at: "",
			expires_at: "",
			usage_limit: "",
			per_user_limit: "1",
			vehicle_type_restrictions: "",
			is_public: undefined,
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (coupon) => {
		if(!vehiclePricesPermissions.can_edit){
			toast.error("You don't have permission to edit coupons")
			return
		}
		setEditingCoupon(coupon)
		setFormData({
			code: coupon.code,
			coupon_type: coupon.coupon_type,
			description: coupon.description || "",
			special_message: coupon.special_message || "",
			discount_type: coupon.discount_type,
			discount_value: coupon.discount_value,
			max_discount: coupon.max_discount || "",
			min_order_value: coupon.min_order_value || "",
			starts_at: coupon.starts_at.slice(0, 16),
			expires_at: coupon.expires_at.slice(0, 16),
			usage_limit: coupon.usage_limit || "",
			per_user_limit: coupon.per_user_limit,
			vehicle_type_restrictions: coupon.vehicle_type_restrictions || "",
			is_public: coupon.is_public,
			status: coupon.status,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleCancelEdit = () => {
		setEditingCoupon(null)
		setFormData({
			code: "",
			coupon_type: "general",
			description: "",
			special_message: "",
			discount_type: "percentage",
			discount_value: "",
			max_discount: "",
			min_order_value: "",
			starts_at: "",
			expires_at: "",
			usage_limit: "",
			per_user_limit: "1",
			vehicle_type_restrictions: "",
			is_public: undefined,
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleSaveCoupon = async () => {
		setIsLoading(true)
		try {
			const url = editingCoupon?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/coupons`
				: `${import.meta.env.VITE_API_URL}/admin/coupons/${editingCoupon.id}`
			const method = editingCoupon?.isNew ? "post" : "put"
			const response = await axios[method](url, {
				...formData,
				code: formData.code.toUpperCase(),
			})
			if (response.data.success) {
				toast.success(
				editingCoupon?.isNew
					? "Coupon created successfully"
					: "Coupon updated successfully"
				)
				fetchCoupons(
				currentPage,
				perPage,
				searchQuery,
				statusFilter,
				couponTypeFilter
				)
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save coupon")
			}
			console.error("handleSaveCoupon error:", err)
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (id) => {
		if (window.confirm("Are you sure you want to delete this coupon?")) {
		try {
			const response = await axios.delete(
			`${import.meta.env.VITE_API_URL}/admin/coupons/${id}`
			)
			if (response.data.success) {
			toast.success("Coupon deleted successfully")
			fetchCoupons(
				currentPage,
				perPage,
				searchQuery,
				statusFilter,
				couponTypeFilter
			)
			}
		} catch (err) {
			toast.error(
			err.response?.status === 404
				? "Coupon not found."
				: "Failed to delete coupon."
			)
			console.error("handleDeleteClick error:", err)
		}
		}
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const handleStatusFilterChange = (selected) => {
		setStatusFilter(selected.value)
		setCurrentPage(1)
	}

	const handleCouponTypeFilterChange = (selected) => {
		setCouponTypeFilter(selected.value)
		setCurrentPage(1)
	}

	const applyFilters = () => {
		setIsFilterOffcanvasOpen(false)
		fetchCoupons(1, perPage, searchQuery, statusFilter, couponTypeFilter)
	}

	const resetFilters = () => {
		setSearchQuery("")
		setStatusFilter("all")
		setCouponTypeFilter("all")
		setCurrentPage(1)
		setIsFilterOffcanvasOpen(false)
		fetchCoupons(1, perPage, "", "all", "all")
	}

	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage) => {
		setPerPage(newPerPage)
		setCurrentPage(1)
	}
	const renderCouponForm = () => (
		<div className="grid md:grid-cols-12 gap-4">
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Coupon Code"
				name="code"
				error={backendErrors.code}
				required={true}
				>
				<ThemeUI.Input
					id="code"
					name="code"
					value={formData.code}
					onChange={(e) =>
					setFormData({ ...formData, code: e.target.value.toUpperCase() })
					}
					placeholder="e.g., SAVE10"
					error={backendErrors.code}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Coupon Type"
				name="coupon_type"
				error={backendErrors.coupon_type}
				required={true}
				>
				<ThemeUI.Select
					id="coupon_type"
					name="coupon_type"
					value={formData.coupon_type}
					onChange={(selected) =>
					setFormData({ ...formData, coupon_type: selected.value })
					}
					options={[
					{ value: "general", label: "General" },
					{ value: "firstride", label: "First Ride" },
					{ value: "referral", label: "Referral" },
					{ value: "seasonal", label: "Seasonal" },
					{ value: "targeted", label: "Targeted" },
					]}
					placeholder="Select coupon type"
					error={backendErrors.coupon_type}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Description"
				name="description"
				error={backendErrors.description}
				>
				<ThemeUI.Textarea
					id="description"
					name="description"
					rows="2"
					value={formData.description}
					onChange={handleInputChange}
					placeholder="Enter coupon description"
					error={backendErrors.description}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Special Message"
				name="special_message"
				error={backendErrors.special_message}
				>
				<ThemeUI.Textarea
					id="special_message"
					name="special_message"
					rows="2"
					value={formData.special_message}
					onChange={handleInputChange}
					placeholder="e.g., Reward is applicable for first-time users only"
					error={backendErrors.special_message}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Discount Type"
				name="discount_type"
				error={backendErrors.discount_type}
				required={true}
				>
				<ThemeUI.Select
					id="discount_type"
					name="discount_type"
					value={formData.discount_type}
					onChange={(selected) =>
					setFormData({ ...formData, discount_type: selected.value })
					}
					options={[
					{ value: "percentage", label: "Percentage" },
					{ value: "fixed", label: "Fixed Amount" },
					]}
					placeholder="Select discount type"
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Discount Value"
				name="discount_value"
				error={backendErrors.discount_value}
				required={true}
				>
				<ThemeUI.Input
					id="discount_value"
					name="discount_value"
					type="number"
					step="0.01"
					value={formData.discount_value}
					onChange={handleInputChange}
					placeholder="e.g., 10"
					error={backendErrors.discount_value}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Max Discount (₹)"
				name="max_discount"
				error={backendErrors.max_discount}
				>
				<ThemeUI.Input
					id="max_discount"
					name="max_discount"
					type="number"
					step="0.01"
					value={formData.max_discount}
					onChange={handleInputChange}
					placeholder="e.g., 50"
					error={backendErrors.max_discount}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Min Order Value (₹)"
				name="min_order_value"
				error={backendErrors.min_order_value}
				>
				<ThemeUI.Input
					id="min_order_value"
					name="min_order_value"
					type="number"
					step="0.01"
					value={formData.min_order_value}
					onChange={handleInputChange}
					placeholder="e.g., 100"
					error={backendErrors.min_order_value}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Start Date"
				name="starts_at"
				error={backendErrors.starts_at}
				required={true}
				>
				<ThemeUI.Input
					id="starts_at"
					name="starts_at"
					type="datetime-local"
					value={formData.starts_at}
					onChange={handleInputChange}
					error={backendErrors.starts_at}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Expiry Date"
				name="expires_at"
				error={backendErrors.expires_at}
				required={true}
				>
				<ThemeUI.Input
					id="expires_at"
					name="expires_at"
					type="datetime-local"
					value={formData.expires_at}
					onChange={handleInputChange}
					error={backendErrors.expires_at}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Usage Limit"
				name="usage_limit"
				error={backendErrors.usage_limit}
				>
				<ThemeUI.Input
					id="usage_limit"
					name="usage_limit"
					type="number"
					value={formData.usage_limit}
					onChange={handleInputChange}
					placeholder="e.g., 1000"
					error={backendErrors.usage_limit}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
				label="Per User Limit"
				name="per_user_limit"
				error={backendErrors.per_user_limit}
				required={true}
				>
				<ThemeUI.Input
					id="per_user_limit"
					name="per_user_limit"
					type="number"
					value={formData.per_user_limit}
					onChange={handleInputChange}
					placeholder="e.g., 1"
					error={backendErrors.per_user_limit}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
					label="Vehicle Type Restrictions"
					name="vehicle_type_restrictions"
					error={backendErrors.vehicle_type_restrictions}
				>
				<ThemeUI.Select
					id          = "vehicle_type_restrictions"
					name        = "vehicle_type_restrictions"
					isMulti
					value       = { formData.vehicle_type_restrictions ?.split(",").filter((id) => id) || [] }
					onChange    = {(selectedValues) => {
						const selectedIds = selectedValues.join(",") || ""
						setFormData((prev) => ({
							...prev,
							vehicle_type_restrictions: selectedIds,
						}))
						if(backendErrors.vehicle_type_restrictions){
							setBackendErrors((prev) => ({
								...prev,
								vehicle_type_restrictions: ""
							}))
						}
					}}
					options     = {vehicleTypes.map((vt) => ({
						value: vt.id.toString(),
						label: vt.name,
					}))}
					placeholder = "Select vehicle types"
					error       = {backendErrors.vehicle_type_restrictions}
				/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
					label = "Public"
					name  = "is_public"
					error = {backendErrors.is_public}
				>
					<ThemeUI.Select
						id       = "is_public"
						name     = "is_public"
						value    = { formData.is_public === undefined ? "" : formData.is_public ? "yes" : "no" }
						onChange = {(selected) => {
							setFormData((prev) => ({
								...prev,
								is_public: selected.value === "yes",
							}))
							if(backendErrors.is_public){
								setBackendErrors((prev) => ({ ...prev, is_public: "" }))
							}
						}}
						options  = {[
							{ value: "", label: "Select visibility" },
							{ value: "yes", label: "Yes" },
							{ value: "no", label: "No" },
						]}
						placeholder = "Select visibility"
						error    = {backendErrors.is_public}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-3">
				<ThemeUI.FormField
					label            = "Status"
					name             = "status"
					error            = {backendErrors.status}
					required
				>
					<ThemeUI.Select
						id           = "status"
						name         = "status"
						value        = {formData.status}
						onChange     = {(selectedOption) => {
							if(selectedOption){
								setFormData((prev) => ({
									...prev,
									status: selectedOption.value,
								}))
							}
							setBackendErrors((prev) => ({ ...prev, status: "" }))
						}}
						options      = {[
							{ value: 1, label: "Active" },
							{ value: 0, label: "Inactive" },
						]}
						placeholder  =  "Select status"
						error        = {backendErrors.status}
						isSearchable = {false}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="md:col-span-12 flex justify-end space-x-2 pt-2">
				<ThemeUI.Button
					type           = "button"
					onClick        = {handleCancelEdit}
					gradientColors = {{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction      = {theme.gradientDirection}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					type           = "button"
					onClick        = {handleSaveCoupon}
					gradientColors = {{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction      = {theme.gradientDirection}
				>
				{isLoading ? (
					<div className="flex items-center space-x-2">
						<Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
						<span>Saving...</span>
					</div>
				) : (
					"Save"
				)}
				</ThemeUI.Button>
			</div>
		</div>
	)

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName      : "Code",
				field           : "code",
				cellRenderer    : (params) => (
					<div>
						<h3 className="font-medium text-lg">{params.data.code}</h3>
						<p className="text-sm text-gray-500 truncate">
							{params.data.description || "No description"}
						</p>
					</div>
				),
				minWidth        : 100,
				flex            : 1,
			},
			{
				headerName      : "Type",
				field           : "coupon_type",
				cellRenderer    : (params) => (
					<p className="text-sm font-medium">{params.value}</p>
				),
				minWidth        : 100,
				flex            : 1,
			},
			{
				headerName      : "Discount",
				field           : "discount_value",
				cellRenderer    : (params) => (
					<p className="text-sm font-medium">
						{params.data.discount_type === "percentage"
							? `${params.value}%`
							: `₹${params.value}`}
					</p>
				),
				minWidth        : 100,
				flex            : 1,
			},
			{
				headerName      : "Validity",
				field           : "starts_at",
				cellRenderer    : (params) => (
					<div className="flex items-center">
						<Clock size={14} className="mr-1 text-gray-400" />
						<p className="text-xs text-gray-600">
							{format(new Date(params.data.starts_at), "MMM d, yyyy")} -{" "}
							{format(new Date(params.data.expires_at), "MMM d, yyyy")}
						</p>
					</div>
				),
				minWidth        : 100,
				flex            : 1.2,
			},
			{
				headerName      : "Status",
				field           : "status",
				cellRenderer    : (params) => (
					<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
						params.value
						? "bg-green-50 text-green-700 border border-green-200"
						: "bg-red-50 text-red-700 border border-red-200"
					}`}
					>
					<span
						className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
						params.value ? "bg-green-500" : "bg-red-500"
						}`}
					></span>
					{params.value ? "Active" : "Inactive"}
					</span>
				),
				minWidth        : 90,
				flex            : 1,
			},
		]
		// Only add Actions column if user has edit or delete permission
		if(couponsPermissions.can_edit || couponsPermissions.can_delete){
			baseColumns.push({
				headerName  : "Actions",
				field       : "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{couponsPermissions.can_edit && (
							<button
								onClick   = {() => handleEditClick(params.data)}
								className = "p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title     = "Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{couponsPermissions.can_delete && (
							<button
								onClick   = {() => handleDeleteClick(params.data.id)}
								className = "p-1 text-red-600 hover:text-red-800 transition-colors"
								title     = "Delete"
							>
								<Trash2 size={16} />
							</button>
						)}
					</div>
				),
				minWidth    : 100,
				flex        : 0.5,
				sortable    : false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, couponsPermissions, handleEditClick, handleDeleteClick])

	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex flex-row justify-between items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Coupons</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
				<ol className="flex items-center">
					<li>
					<a
						href="/dashboard"
						className="hover:text-blue-600 transition-colors"
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
					Coupons
					</li>
				</ol>
				</nav>
			</div>
			{/* Search and filter controls */}
			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
				<div className="w-full sm:w-1/3">
					<ThemeUI.Input
					id="search"
					name="search"
					value={searchQuery}
					className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
					onChange={handleSearchChange}
					placeholder="Search by name..."
					leftElement={<Search size={16} className="text-gray-400" />}
					/>
				</div>
				<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto">
					<ThemeUI.Button
					type="button"
					onClick={() => setIsFilterOffcanvasOpen(true)}
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					>
					<Filter size={16} className="mr-2" /> Filters
					</ThemeUI.Button>
					{couponsPermissions.can_add && (
						<ThemeUI.Button
						type="button"
						onClick={handleAddClick}
						gradientColors={{
							start: theme.primaryGradientStart,
							end: theme.primaryGradientEnd,
						}}
						direction={theme.gradientDirection}
						>
						<Plus size={16} className="mr-2" /> Add Coupon
						</ThemeUI.Button>
					)}
				</div>
				</div>
			</div>
			{/* Custom Grid Rendering */}
			{isLoading ? (
				<div className="flex justify-center items-center h-64">
				<Loader
					className="animate-spin"
					size={32}
					style={{ color: theme.primaryGradientStart }}
				/>
				</div>
			) : (
				<div
				style={{
					"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
				}}
				>
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
					columnDefs={columnDefs}
					rowData={coupons}
					rowHeight={55}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					paginationNumberFormatter={(params) => `${params.value}`}
					suppressCellFocus
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Coupons Found" }}
					onPaginationChanged={(params) => {
					if (params.api) {
						const newPage = params.api.paginationGetCurrentPage() + 1
						handlePageChange(newPage)
					}
					}}
				/>
				</div>
			)}
			{/* Modal and Offcanvas */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={
				editingCoupon?.isNew
					? "Add New Coupon"
					: `Edit ${editingCoupon?.code || "Coupon"}`
				}
				size="full"
			>
				{renderCouponForm()}
			</Modal>
			<Offcanvas
				isOpen={isFilterOffcanvasOpen}
				onClose={() => setIsFilterOffcanvasOpen(false)}
				title="Filter Options"
				position="right"
				size="sm"
			>
				<div className="space-y-4">
				<ThemeUI.FormField label="Status" name="status">
					<ThemeUI.Select
					id="status"
					name="status"
					value={statusFilter}
					onChange={handleStatusFilterChange}
					options={[
						{ value: "all", label: "All" },
						{ value: "1", label: "Active" },
						{ value: "0", label: "Inactive" },
					]}
					placeholder="Filter by status"
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Coupon Type" name="coupon_type">
					<ThemeUI.Select
					id="coupon_type"
					name="coupon_type"
					value={couponTypeFilter}
					onChange={handleCouponTypeFilterChange}
					options={[
						{ value: "all", label: "All" },
						{ value: "general", label: "General" },
						{ value: "firstride", label: "First Ride" },
						{ value: "referral", label: "Referral" },
						{ value: "seasonal", label: "Seasonal" },
						{ value: "targeted", label: "Targeted" },
					]}
					placeholder="Filter by coupon type"
					/>
				</ThemeUI.FormField>
				<div className="flex justify-between pt-4">
					<ThemeUI.Button
					type="button"
					onClick={resetFilters}
					gradientColors={{
						start: theme.secondaryGradientStart,
						end: theme.secondaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					>
					Reset
					</ThemeUI.Button>
					<ThemeUI.Button
					type="button"
					onClick={applyFilters}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					>
					Apply Filters
					</ThemeUI.Button>
				</div>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default Coupons
