import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Download, Star } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'
function Subscriptions() {
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [plans, setPlans] = useState([])
	const [editingPlan, setEditingPlan] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [durationTypeFilter, setDurationTypeFilter] = useState("")
	const [isPopularFilter, setIsPopularFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by plan name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["plan name", "description", "price"]

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		price: "",
		duration_type: "days",
		duration_value: "",
		commission_waiver: true,
		max_daily_rides: "",
		is_popular: false,
		sort_order: "",
		status: "active",
	})

	// Permissions
	const [subscriptionPermissions, setSubscriptionPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				console.log(permissions);
				if (permissions.subscriptions) {
					return {
						can_add: permissions.subscriptions.can_add || false,
						can_edit: permissions.subscriptions.can_edit || false,
						can_delete: permissions.subscriptions.can_delete || false,
						can_view: permissions.subscriptions.can_view || false
					}
				}
			}
			return { can_add: false, can_edit: false, can_delete: false, can_view: false }
		} catch (error) {
			console.error('Error parsing user permissions:', error)
			return { can_add: false, can_edit: false, can_delete: false, can_view: false }
		}
	}, [])

	useEffect(() => {
		const permissions = getUserPermissions()
		setSubscriptionPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setSubscriptionPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Fetch plans
	useEffect(() => {
		fetchPlans()
	}, [currentPage, perPage, searchQuery, statusFilter, durationTypeFilter, isPopularFilter])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex(prev => prev + 1)
			} else if (isDeleting && currentCharIndex > 0) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex(prev => prev - 1)
			} else if (!isDeleting && currentCharIndex === currentWord.length) {
				setTimeout(() => setIsDeleting(true), pauseTime)
			} else if (isDeleting && currentCharIndex === 0) {
				setIsDeleting(false)
				setCurrentWordIndex(prev => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting])

	const fetchPlans = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subscriptions/plans`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter || "",
					duration_type: durationTypeFilter || "",
					is_popular: isPopularFilter || "",
					_t: Date.now()
				}
			})
			if (response.data.success) {
				setPlans(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, durationTypeFilter, isPopularFilter])

	// Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			const exportData = plans.map((plan, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Name': plan.name,
				'Description': plan.description || '-',
				'Price': `₹${plan.price}`,
				'Duration': `${plan.duration_value} ${plan.duration_type === 'days' ? 'Days' : 'Rides'}`,
				'Commission Waiver': plan.commission_waiver ? 'Yes' : 'No',
				'Max Daily Rides': plan.max_daily_rides || 'Unlimited',
				'Popular': plan.is_popular ? 'Yes' : 'No',
				'Sort Order': plan.sort_order,
				'Status': plan.status.charAt(0).toUpperCase() + plan.status.slice(1),
				'Created At': new Date(plan.created_at).toLocaleString(),
				'Updated At': new Date(plan.updated_at).toLocaleString()
			}))

			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [
				{ wch: 8 }, { wch: 20 }, { wch: 40 }, { wch: 12 },
				{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
				{ wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 }
			]
			XLSX.utils.book_append_sheet(wb, ws, 'Subscription Plans')
			const timestamp = new Date().toISOString().split('T')[0]
			XLSX.writeFile(wb, `subscription_plans_${timestamp}.xlsx`)
			toast.success('Excel file exported successfully')
		} catch (error) {
			console.error('Error exporting to Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [plans, currentPage, perPage])

	const handleAddClick = () => {
		if (!subscriptionPermissions.can_add) {
			toast.error("You don't have permission to create subscription plan")
			return
		}
		setEditingPlan({ isNew: true })
		setFormData({
			name: "",
			description: "",
			price: "",
			duration_type: "days",
			duration_value: "",
			commission_waiver: true,
			max_daily_rides: "",
			is_popular: false,
			sort_order: "",
			status: "active",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (plan) => {
		setEditingPlan(plan)
		setFormData({
			name: plan.name || "",
			description: plan.description || "",
			price: plan.price || "",
			duration_type: plan.duration_type || "days",
			duration_value: plan.duration_value || "",
			commission_waiver: plan.commission_waiver,
			max_daily_rides: plan.max_daily_rides || "",
			is_popular: plan.is_popular || false,
			sort_order: plan.sort_order ?? "",
			status: plan.status || "active",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSavePlan = async () => {
		setIsLoading(true)
		try {
			const url = editingPlan?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/subscriptions/plans`
				: `${import.meta.env.VITE_API_URL}/admin/subscriptions/plans/${editingPlan.id}`
			const method = editingPlan?.isNew ? "post" : "put"
			const submitData = {
				name: formData.name.trim(),
				description: formData.description.trim() || null,
				price: formData.price && !isNaN(formData.price) && Number(formData.price) > 0 ? Number(formData.price) : null,
				duration_type: formData.duration_type,
				duration_value: formData.duration_value && !isNaN(formData.duration_value) && Number(formData.duration_value) > 0 ? Number(formData.duration_value) : null,
				commission_waiver: formData.commission_waiver,
				max_daily_rides: formData.max_daily_rides ? Number(formData.max_daily_rides) : null,
				is_popular: formData.is_popular,
				sort_order: formData.sort_order && !isNaN(formData.sort_order) && Number(formData.sort_order) > 0 ? Number(formData.sort_order) : null,
				status: formData.status,
			}
			const response = await axios[method](url, submitData)
			if (response.data.success) {
				toast.success(editingPlan?.isNew ? "Plan created successfully" : "Plan updated successfully")
				fetchPlans()
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save plan")
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (id) => {
		if (!window.confirm("Are you sure you want to delete this subscription plan?")) return
		setIsLoading(true)
		try {
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/subscriptions/plans/${id}`)
			if (response.data.success) {
				toast.success("Plan deleted successfully")
				fetchPlans()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete plan")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancelEdit = () => {
		setEditingPlan(null)
		setFormData({
			name: "",
			description: "",
			price: "",
			duration_type: "days",
			duration_value: "",
			commission_waiver: true,
			max_daily_rides: "",
			is_popular: false,
			sort_order: "",
			status: "active",
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleSelectChange = (name, selectedOption) => {
		setFormData(prev => ({ ...prev, [name]: selectedOption.value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				width: 80,
				sortable: false,
				valueGetter: params => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
			},
			{
				headerName: "Plan Name",
				field: "name",
				sortable: true,
				minWidth: 150,
				flex: 1,
			},
			{
				headerName: "Price",
				field: "price",
				sortable: true,
				minWidth: 100,
				valueFormatter: params => `₹${params.value}`,
			},
			{
				headerName: "Duration",
				minWidth: 120,
				valueGetter: params => `${params.data.duration_value} ${params.data.duration_type === 'days' ? 'Days' : 'Rides'}`,
			},
			{
				headerName: "Popular",
				field: "is_popular",
				minWidth: 90,
				cellRenderer: params => params.value ? <Star size={18} className="text-yellow-500 fill-yellow-500" /> : "-",
			},
			{
				headerName: "Status",
				field: "status",
				minWidth: 100,
				cellRenderer: params => {
					const colors = {
						active: "bg-green-100 text-green-800",
						inactive: "bg-gray-100 text-gray-800",
						archived: "bg-red-100 text-red-800"
					}
					return (
						<span className={`px-2 py-1 rounded-full text-xs ${colors[params.value] || colors.inactive}`}>
							{params.value.charAt(0).toUpperCase() + params.value.slice(1)}
						</span>
					)
				},
			},
			{
				headerName: "Created At",
				field: "created_at",
				sortable: true,
				minWidth: 150,
				valueFormatter: params => new Date(params.value).toLocaleString(),
			},
		]

		if (subscriptionPermissions.can_edit || subscriptionPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				minWidth: 100,
				cellRenderer: params => (
					<div className="flex items-center gap-2">
						{subscriptionPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{subscriptionPermissions.can_delete && (
							<button
								onClick={() => handleDeleteClick(params.data.id)}
								className="p-1 text-red-600 hover:text-red-800 transition-colors"
								title="Delete"
							>
								<Trash2 size={16} />
							</button>
						)}
					</div>
				),
				sortable: false,
			})
		}

		return baseColumns
	}, [currentPage, perPage, theme.primaryGradientStart, subscriptionPermissions])

	const renderPlanForm = () => {
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-5 gap-4">
					<ThemeUI.FormField label="Plan Name" name="name" error={backendErrors.name} required>
						<ThemeUI.Input
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							placeholder="e.g., Premium Plan"
							error={backendErrors.name}
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Price (₹)" name="price" error={backendErrors.price} required>
						<ThemeUI.Input
							name="price"
							type="number"
							step="0.01"
							value={formData.price}
							onChange={handleInputChange}
							placeholder="29.99"
							error={backendErrors.price}
						/>
						<p className="text-xs text-gray-500 mt-1">
							How much will drivers pay for this plan?
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Duration Type" name="duration_type" error={backendErrors.duration_type} required>
						<ThemeUI.Select
							name="duration_type"
							value={formData.duration_type}
							onChange={(opt) => handleSelectChange("duration_type", opt)}
							options={[
								{ value: "days", label: "Days" },
								{ value: "rides", label: "Rides" }
							]}
							error={backendErrors.duration_type}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Is this plan valid for a number of days or a number of rides?
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Duration Value" name="duration_value" error={backendErrors.duration_value} required>
						<ThemeUI.Input
							name="duration_value"
							type="number"
							value={formData.duration_value}
							onChange={handleInputChange}
							placeholder="30"
							error={backendErrors.duration_value}
						/>
						<p className="text-xs text-gray-500 mt-1">
							How many days or rides does this plan include?
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Commission Waiver" name="commission_waiver">
						<ThemeUI.Select
							name="commission_waiver"
							value={formData.commission_waiver}
							onChange={(opt) => handleSelectChange("commission_waiver", opt)}
							options={[
								{ value: true, label: "Yes" },
								{ value: false, label: "No" }
							]}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Should drivers with this plan skip paying commission? (Yes = No commission)
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Max Daily Rides" name="max_daily_rides">
						<ThemeUI.Input
							name="max_daily_rides"
							type="number"
							value={formData.max_daily_rides}
							onChange={handleInputChange}
							placeholder="Unlimited (leave empty)"
							error={backendErrors.max_daily_rides}
						/>
						<p className="text-xs text-gray-500 mt-1">
							How many rides per day can drivers take? (Leave empty for unlimited)
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Popular Plan" name="is_popular" >
						<ThemeUI.Select
							name="is_popular"
							value={formData.is_popular}
							onChange={(opt) => handleSelectChange("is_popular", opt)}
							options={[
								{ value: false, label: "No" },
								{ value: true, label: "Yes" }
							]}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Show this plan with a "Popular" or "Recommended" badge? (Only 1 plan can be popular)
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Sort Order" name="sort_order" error={backendErrors.sort_order}>
						<ThemeUI.Input
							name="sort_order"
							type="number"
							value={formData.sort_order}
							onChange={handleInputChange}
							placeholder="0"
							error={backendErrors.sort_order}
						/>
						<p className="text-xs text-gray-500 mt-1">
							In which position should this plan appear? (0 = first, 1 = second, etc.)
						</p>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Status" name="status" required>
						<ThemeUI.Select
							name="status"
							value={formData.status}
							onChange={(opt) => handleSelectChange("status", opt)}
							options={[
								{ value: "active", label: "Active" },
								{ value: "inactive", label: "Inactive" },
								{ value: "archived", label: "Archived" }
							]}
							error={backendErrors.status}
						/>
					</ThemeUI.FormField>
				</div>

				<ThemeUI.FormField label="Description" name="description">
					<ThemeUI.Textarea
						name="description"
						value={formData.description}
						onChange={handleInputChange}
						rows={3}
						placeholder="Plan benefits and details..."
						error={backendErrors.description}
					/>
				</ThemeUI.FormField>

				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button onClick={handleCancelEdit} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						onClick={handleSavePlan}
						disabled={isLoading}
						gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingPlan?.isNew ? "Create Plan" : "Update Plan"}
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			{/* Header */}
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Subscription Plans</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
						<li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Subscriptions</li>
					</ol>
				</nav>
			</div>

			{/* Controls */}
			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							value={searchQuery}
							onChange={handleSearchChange}
							placeholder={placeholder}
							leftElement={<Search size={16} className="text-gray-400" />}
						/>
					</div>
					<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto">
						<ThemeUI.Button onClick={handleExcelExport} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
						<ThemeUI.Button onClick={() => setIsFilterOffcanvasOpen(true)} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
							<Filter size={16} className="mr-2" /> Filters
						</ThemeUI.Button>
						{subscriptionPermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
								<Plus size={16} className="mr-2" /> Add Plan
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>

			{/* Table */}
			<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
				<AgGridReact
					ref={gridRef}
					className="custom-ag-grid"
					domLayout="autoHeight"
					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
					})}
					defaultColDef={{ resizable: true, sortable: true, filter: false }}
					columnDefs={columnDefs}
					rowData={plans}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={(params) => {
						if (!params.api) return
						const newPage = params.api.paginationGetCurrentPage() + 1
						const newPageSize = params.api.paginationGetPageSize()
						if (newPage !== currentPage) setCurrentPage(newPage)
						if (newPageSize !== perPage) {
							setPerPage(newPageSize)
							setCurrentPage(1)
						}
					}}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Subscription Plans Found" }}
					loading={isLoading}
				/>
			</div>

			{/* Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingPlan?.isNew ? "Add Subscription Plan" : "Edit Subscription Plan"}
				size="full"
			>
				{renderPlanForm()}
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
					<ThemeUI.FormField label="Status">
						<ThemeUI.Select
							value={statusFilter ? { value: statusFilter, label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) } : null}
							onChange={(opt) => { setStatusFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "active", label: "Active" },
								{ value: "inactive", label: "Inactive" },
								{ value: "archived", label: "Archived" }
							]}
							placeholder="All statuses"
							isClearable
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Duration Type">
						<ThemeUI.Select
							value={durationTypeFilter ? { value: durationTypeFilter, label: durationTypeFilter === 'days' ? 'Days' : 'Rides' } : null}
							onChange={(opt) => { setDurationTypeFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "days", label: "Days" },
								{ value: "rides", label: "Rides" }
							]}
							placeholder="All types"
							isClearable
						/>
					</ThemeUI.FormField>

					<ThemeUI.FormField label="Popular">
						<ThemeUI.Select
							value={isPopularFilter ? { value: isPopularFilter, label: isPopularFilter === "1" ? "Yes" : "No" } : null}
							onChange={(opt) => { setIsPopularFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "1", label: "Yes" },
								{ value: "0", label: "No" }
							]}
							placeholder="All"
							isClearable
						/>
					</ThemeUI.FormField>

					<div className="flex gap-2">
						<ThemeUI.Button
							onClick={() => {
								setStatusFilter("")
								setDurationTypeFilter("")
								setIsPopularFilter("")
								setCurrentPage(1)
							}}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
						>
							Reset Filters
						</ThemeUI.Button>
					</div>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default Subscriptions