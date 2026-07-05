import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Download } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'

function CancellationPolicy() {
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const pageSizes = [10, 20, 50, 100]
	const [pageSize, setPageSize] = useState(pageSizes[0])
	const [policies, setPolicies] = useState([])
	const [editingPolicy, setEditingPolicy] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [formData, setFormData] = useState({
		hours: "",
		percentage: "",
		status: 1,
	})

	// Initialize permissions with safe defaults
	const [policyPermissions, setPolicyPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get user permissions for the cancellation policy module 
	const getUserPermissions = useCallback(() => {
		try {
			const permissionsStr = localStorage.getItem('userPermissions')
			if (permissionsStr) {
				const permissions = JSON.parse(permissionsStr)
				if (permissions.cancellationpolicy) {
					return {
						can_add: permissions.cancellationpolicy.can_add || false,
						can_edit: permissions.cancellationpolicy.can_edit || false,
						can_delete: permissions.cancellationpolicy.can_delete || false,
						can_view: permissions.cancellationpolicy.can_view || false
					}
				}
			}
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		} catch (error) {
			console.error('Error parsing user permissions:', error)
			return {
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		}
	}, [])

	// Load permissions on mount
	useEffect(() => {
		const permissions = getUserPermissions()
		setPolicyPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setPolicyPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch policies on mount and when search/filter changes
	useEffect(() => {
		fetchPolicies()
	}, [searchQuery, statusFilter])

	// Fetch policies
	const fetchPolicies = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/cancellation-policy`,
				{
					params: {
						limit: pageSize,
						page: 1,
						search: searchQuery,
						status: statusFilter,
						_t: Date.now(), 
					},
				}
			)
			if (response.data.success) {
				setPolicies(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching policies:", err)
			toast.error(err.response?.data?.message || "Failed to fetch cancellation policies")
			setPolicies([])
		} finally {
			setIsLoading(false)
		}
	}, [searchQuery, statusFilter, pageSize])

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			// Prepare data for export
			const exportData = policies.map((policy, index) => ({
				'S.No': index + 1,
				'Hours (Before)': policy.hours,
				'Percentage (%)': policy.percentage,
				'Status': policy.status === 1 ? 'Active' : 'Inactive',
				'Created At': new Date(policy.created_at).toLocaleString(),
				'Updated At': new Date(policy.updated_at).toLocaleString()
			}))
			// Create workbook and worksheet
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			// Set column widths
			ws['!cols'] = [
				{ wch: 8 },  // S.No
				{ wch: 20 }, // Hours
				{ wch: 15 }, // Percentage
				{ wch: 12 }, // Status
				{ wch: 20 }, // Created At
				{ wch: 20 }  // Updated At
			]
			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Cancellation Policies')
			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0]
			const filename = `cancellation_policies_${timestamp}.xlsx`
			// Write file
			XLSX.writeFile(wb, filename)
			toast.success('Excel file exported successfully')
		} catch (error) {
			console.error('Error exporting to Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [policies])

	// Handle add policy button
	const handleAddClick = useCallback(() => {
		if (!policyPermissions.can_add) {
			toast.error("You don't have permission to create cancellation policy")
			return
		}
		setEditingPolicy({ isNew: true })
		setFormData({
			hours: "",
			percentage: "",
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}, [policyPermissions.can_add])

	// Handle edit policy button
	const handleEditClick = useCallback((policy) => {
		if (!policyPermissions.can_edit) {
			toast.error("You don't have permission to edit cancellation policy")
			return
		}
		setEditingPolicy(policy)
		setFormData({
			hours: policy.hours || "",
			percentage: policy.percentage || "",
			status: policy.status === 1 || policy.status === "1" ? 1 : 0,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}, [policyPermissions.can_edit])

	// Handle save policy
	const handleSavePolicy = useCallback(async () => {
		setIsLoading(true)
		try {
			const url = editingPolicy?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/cancellation-policy`
				: `${import.meta.env.VITE_API_URL}/admin/cancellation-policy/${editingPolicy.id}`
			const method = editingPolicy?.isNew ? "post" : "put"
			const submitData = {
				hours: parseInt(formData.hours),
				percentage: parseInt(formData.percentage),
				status: parseInt(formData.status),
			}
			const response = await axios[method](url, submitData)
			if (response.data.success) {
				toast.success(
					editingPolicy?.isNew
						? "Cancellation policy created successfully"
						: "Cancellation policy updated successfully"
				)
				fetchPolicies()
				handleCancelEdit()
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save cancellation policy")
			}
		} finally {
			setIsLoading(false)
		}
	}, [editingPolicy?.isNew, editingPolicy?.id, formData, fetchPolicies])

	// Handle delete policy
	const handleDeleteClick = useCallback(async (policyId) => {
		if (!policyPermissions.can_delete) {
			toast.error("You don't have permission to delete cancellation policy")
			return
		}
		if (!window.confirm(`Are you sure you want to delete this cancellation policy?`))
			return
		setIsLoading(true)
		try {
			const response = await axios.delete(
				`${import.meta.env.VITE_API_URL}/admin/cancellation-policy/${policyId}`
			)
			if (response.data.success) {
				toast.success("Cancellation policy deleted successfully")
				fetchPolicies()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to delete cancellation policy")
			console.error("handleDeleteClick error:", err)
		} finally {
			setIsLoading(false)
		}
	}, [policyPermissions.can_delete, fetchPolicies])

	// Handle cancel edit
	const handleCancelEdit = () => {
		setEditingPolicy(null)
		setFormData({
			hours: "",
			percentage: "",
			status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(false)
	}

	// Handle input change
	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}))
		setBackendErrors((prev) => ({ ...prev, [name]: "" }))
	}

	// Handle status change
	const handleStatusChange = (selectedOption) => {
		setFormData((prev) => ({
			...prev,
			status: selectedOption.value,
		}))
		setBackendErrors((prev) => ({ ...prev, status: "" }))
	}

	// Handle search
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
	}

	// DataTable columns - with conditional Actions column
	const columnDefs = useMemo(() => {
		const baseColumns = [
			{
				headerName: "S.No",
				width: 80,
				sortable: false,
				valueGetter: (params) => {
					if (!params.api) return 0;
					const page = params.api.paginationGetCurrentPage();
					const pSize = params.api.paginationGetPageSize();
					const rowIndex = params.node.rowIndex ?? 0;
					return (page * pSize) + rowIndex + 1;
				},
			},
			{
				headerName: "Hours (Before)",
				field: "hours",
				sortable: true,
				minWidth: 120,
				flex: 1,
			},
			{
				headerName: "Percentage (%)",
				field: "percentage",
				sortable: true,
				minWidth: 120,
				flex: 1,
			},
			{
				headerName: "Status",
				field: "status",
				sortable: true,
				minWidth: 90,
				flex: 1,
				cellRenderer: (params) => (
					<span
						className={`px-2 py-1 rounded-full text-xs ${params.value === 1
								? "bg-green-100 text-green-800"
								: "bg-red-100 text-red-800"
							}`}
					>
						{params.value === 1 ? "Active" : "Inactive"}
					</span>
				),
			},
			{
				headerName: "Created At",
				field: "created_at",
				sortable: true,
				minWidth: 150,
				flex: 1,
				valueFormatter: (params) => new Date(params.value).toLocaleString(),
			},
			{
				headerName: "Updated At",
				field: "updated_at",
				sortable: true,
				minWidth: 150,
				flex: 1,
				valueFormatter: (params) => new Date(params.value).toLocaleString(),
			},
		]
		// Only add Actions column if user has edit or delete permission
		if (policyPermissions.can_edit || policyPermissions.can_delete) {
			baseColumns.push({
				headerName: "Actions",
				field: "actions",
				cellRenderer: (params) => (
					<div className="flex items-center gap-2">
						{policyPermissions.can_edit && (
							<button
								onClick={() => handleEditClick(params.data)}
								className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{policyPermissions.can_delete && (
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
				minWidth: 100,
				flex: 0.5,
				sortable: false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, policyPermissions, handleEditClick, handleDeleteClick])

	// Render policy form
	const renderPolicyForm = () => {
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-3 gap-4">
					<ThemeUI.FormField
						label="Hours (Before Cancellation)"
						name="hours"
						error={backendErrors.hours}
						required={true}
					>
						<ThemeUI.Input
							id="hours"
							name="hours"
							type="number"
							value={formData.hours}
							onChange={handleInputChange}
							placeholder="Enter hours before cancellation"
							error={backendErrors.hours}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField
						label="Percentage (%)"
						name="percentage"
						error={backendErrors.percentage}
						required={true}
					>
						<ThemeUI.Input
							id="percentage"
							name="percentage"
							type="number"
							value={formData.percentage}
							onChange={handleInputChange}
							placeholder="Enter deduction percentage"
							error={backendErrors.percentage}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField
						label="Status"
						name="status"
						error={backendErrors.status}
						required={true}
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
						/>
					</ThemeUI.FormField>
				</div>
				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button
						type="button"
						onClick={handleCancelEdit}
						gradientColors={{
							start: theme.secondaryGradientStart,
							end: theme.secondaryGradientEnd,
						}}
					>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						type="button"
						onClick={handleSavePolicy}
						disabled={isLoading}
						gradientColors={{
							start: theme.primaryGradientStart,
							end: theme.primaryGradientEnd,
						}}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<>
								<Loader size={16} className="mr-2 animate-spin" />
								Saving...
							</>
						) : editingPolicy?.isNew ? (
							"Create Policy"
						) : (
							"Update Policy"
						)}
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1 ">
					Cancellation Policy
				</h1>
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
							Cancellation Policy
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
							placeholder="Search by hours or percentage"
							leftElement={<Search size={16} className="text-gray-400" />}
						/>
					</div>
					<div className="flex max-sm:h-10 justify-between gap-2 w-full sm:w-auto max-sm:text-sm">
						<ThemeUI.Button
							type="button"
							onClick={handleExcelExport}
							gradientColors={{
								start: theme.secondaryGradientStart,
								end: theme.secondaryGradientEnd,
							}}
							direction={theme.gradientDirection}
							aria-label="Export to Excel"
						>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
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
							<Filter size={16} className="mr-2" /> Filters
						</ThemeUI.Button>
						{policyPermissions.can_add && (
							<ThemeUI.Button
								type="button"
								onClick={handleAddClick}
								gradientColors={{
									start: theme.primaryGradientStart,
									end: theme.primaryGradientEnd,
								}}
								direction={theme.gradientDirection}
								aria-label="Add new policy"
							>
								<Plus size={16} className="mr-2" /> Add Policy
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>
			{/* Datatable controls */}
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
						paginationPanelHeight: 50,
					})}
					defaultColDef={{
						resizable: false,
						suppressSizeToFit: false,
					}}
					columnDefs={columnDefs}
					rowData={policies}
					rowHeight={55}
					pagination={true}
					paginationPageSize={pageSize}
					paginationPageSizeSelector={pageSizes}
					paginationNumberFormatter={(params) => `${params.value}`}
					suppressCellFocus
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Policies Found" }}
					onGridReady={(params) => {
						gridRef.current = params;
						if (pageSize) {
							params.api.paginationSetPageSize(pageSize);
						}
					}}
					onPaginationChanged={(params) => {
						if (params.newPageSize !== params.oldPageSize) {
							if (typeof params.newPageSize === 'number' && pageSizes.includes(params.newPageSize)) {
								setPageSize(params.newPageSize);
							}
						}
					}}
				/>
			</div>
			{/* Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCancelEdit}
				title={editingPolicy?.isNew ? "Add Cancellation Policy" : "Edit Cancellation Policy"}
				size="full"
			>
				{renderPolicyForm()}
			</Modal>
			{/* Offcanvas */}
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
							value={
								statusFilter
									? {
										value: statusFilter,
										label: statusFilter === "1" ? "Active" : "Inactive",
									}
									: null
							}
							onChange={(selected) => {
								setStatusFilter(selected?.value || "")
							}}
							options={[
								{ value: "1", label: "Active" },
								{ value: "0", label: "Inactive" },
							]}
							placeholder="Filter by status"
							isClearable={true}
						/>
					</ThemeUI.FormField>
					<div className="flex gap-2">
						<ThemeUI.Button
							type="button"
							onClick={() => {
								setStatusFilter("")
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
		</Layout>
	)
}
export default CancellationPolicy