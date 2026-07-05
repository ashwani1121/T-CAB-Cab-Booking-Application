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

function Licensing() {
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [licensings, setLicensings] = useState([])
	const [editingLicense, setEditingLicense] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [planFilter, setPlanFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by license ID...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["license ID", "client", "company", "domain"]
	
	const [formData, setFormData] = useState({
		client_name: "",
		company_name: "",
		domain: "",
		server_ip: "",
		plan: "lifetime",
		expiry_on: "",
		status: "active",
	})

	// Permissions
	const [licensingPermissions, setLicensingPermissions] = useState({
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
				if (permissions.licensing) {
					return {
						can_add: permissions.licensing.can_add || false,
						can_edit: permissions.licensing.can_edit || false,
						can_delete: permissions.licensing.can_delete || false,
						can_view: permissions.licensing.can_view || false
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
		setLicensingPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setLicensingPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Fetch data
	useEffect(() => {
		fetchLicensings(currentPage, perPage, searchQuery, statusFilter, planFilter)
	}, [currentPage, perPage, searchQuery, statusFilter, planFilter])

	// Typing animation
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

	const fetchLicensings = useCallback(async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/licensing`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter === "all" ? "" : statusFilter,
					plan: planFilter === "all" ? "" : planFilter,
				}
			})
			if (response.data.success) {
				setLicensings(response.data.data)
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			console.error("Error fetching licenses:", err)
			toast.error(err.response?.data?.message || "Failed to fetch licenses")
			setLicensings([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, planFilter])

	// Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			const exportData = licensings.map((item, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'License ID': item.license_id,
				'Client Name': item.client_name,
				'Company Name': item.company_name,
				'Domain': item.domain,
				'Server IP': item.server_ip || '-',
				'Plan': item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
				'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
				'Expiry On': item.expiry_on || 'Lifetime',
				'Created At': new Date(item.created_at).toLocaleString(),
				'Updated At': new Date(item.updated_at).toLocaleString()
			}))

			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [
				{ wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 20 },
				{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
			]
			XLSX.utils.book_append_sheet(wb, ws, 'Licenses')
			const timestamp = new Date().toISOString().split('T')[0]
			XLSX.writeFile(wb, `licenses_${timestamp}.xlsx`)
			toast.success('Excel file exported successfully')
		} catch (error) {
			console.error('Export error:', error)
			toast.error('Failed to export Excel file')
		}
	}, [licensings, currentPage, perPage])

	const handleAddClick = () => {
		if (!licensingPermissions.can_add) {
			toast.error("You don't have permission to create license")
			return
		}
		setEditingLicense({ isNew: true })
		setFormData({
			client_name: "", company_name: "", domain: "", server_ip: "",
			plan: "lifetime", expiry_on: "", status: "active"
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (license) => {
		if (!licensingPermissions.can_edit) {
			toast.error("You don't have permission to edit license")
			return
		}
		setEditingLicense(license)
		setFormData({
			client_name: license.client_name || "",
			company_name: license.company_name || "",
			domain: license.domain || "",
			server_ip: license.server_ip || "",
			plan: license.plan || "lifetime",
			expiry_on: license.expiry_on || "",
			status: license.status || "active",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveLicense = async () => {
		setIsLoading(true)
		try {
			const url = editingLicense?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/licensing`
				: `${import.meta.env.VITE_API_URL}/admin/licensing/${editingLicense.id}`
			const method = editingLicense?.isNew ? "post" : "put"

			const submitData = {
				client_name: formData.client_name,
				company_name: formData.company_name,
				domain: formData.domain,
				server_ip: formData.server_ip || null,
				plan: formData.plan,
				expiry_on: formData.plan === "lifetime" ? null : formData.expiry_on || null,
				status: formData.status,
			}

			const response = await axios[method](url, submitData)
			if (response.data.success) {
				toast.success(editingLicense?.isNew ? "License created successfully" : "License updated successfully")
				fetchLicensings()
				setIsModalOpen(false)
				setEditingLicense(null)
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors in the form.")
			} else {
				toast.error(err.response?.data?.message || "Failed to save license")
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteClick = async (id) => {
		if (!window.confirm("Are you sure you want to terminate this license?")) return
		setIsLoading(true)
		try {
			const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/licensing/${id}`)
			if (response.data.success) {
				toast.success("License terminated successfully")
				fetchLicensings()
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to terminate license")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancel = () => {
		setIsModalOpen(false)
		setEditingLicense(null)
		setFormData({
			client_name: "", company_name: "", domain: "", server_ip: "",
			plan: "lifetime", expiry_on: "", status: "active"
		})
		setBackendErrors({})
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const columnDefs = useMemo(() => {
		const baseColumns = [
			{ headerName: "S.No", width: 80, valueGetter: params => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1 },
			{ headerName: "License ID", field: "license_id", sortable: true, minWidth: 160 },
			{ headerName: "Client Name", field: "client_name", sortable: true, minWidth: 150, flex: 1 },
			{ headerName: "Company", field: "company_name", sortable: true, minWidth: 150, flex: 1 },
			{ headerName: "Domain", field: "domain", sortable: true, minWidth: 180, flex: 1 },
			{ headerName: "Plan", field: "plan", sortable: true, minWidth: 100,
				cellRenderer: params => params.value.charAt(0).toUpperCase() + params.value.slice(1) },
			{ headerName: "Status", field: "status", sortable: true, minWidth: 110,
				cellRenderer: params => {
					const colors = {
						active: "bg-green-100 text-green-800",
						suspended: "bg-yellow-100 text-yellow-800",
						terminated: "bg-red-100 text-red-800"
					}
					return <span className={`px-2 py-1 rounded-full text-xs ${colors[params.value] || ''}`}>
						{params.value.charAt(0).toUpperCase() + params.value.slice(1)}
					</span>
				}},
			{ headerName: "Expiry", field: "expiry_on", sortable: true, minWidth: 120,
				valueFormatter: params => params.value || "Lifetime" },
			{ headerName: "Created At", field: "created_at", sortable: true, minWidth: 150,
				valueFormatter: params => new Date(params.value).toLocaleString() },
		]

		if (licensingPermissions.can_edit || licensingPermissions.can_delete || licensingPermissions.can_view) {
			baseColumns.push({
				headerName: "Actions",
				cellRenderer: params => (
					<div className="flex items-center gap-2">
						{licensingPermissions.can_edit && (
							<button 
								onClick={() => handleEditClick(params.data)} 
								className="p-1 text-blue-600 hover:text-blue-800" 
								title="Edit"
							>
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{licensingPermissions.can_delete && (
							<button 
								onClick={() => handleDeleteClick(params.data.id)} 
								className="p-1 text-red-600 hover:text-red-800" 
								title="Terminate"
							>
								<Trash2 size={16} />
							</button>
						)}
					</div>
				),
				minWidth: 130,
				sortable: false,
			})
		}
		return baseColumns
	}, [theme.primaryGradientStart, currentPage, perPage, licensingPermissions])

	const renderLicenseForm = () => {
		const isLifetime = formData.plan === "lifetime"
		return (
			<div className="space-y-6 p-4">
				<div className="grid md:grid-cols-4 gap-4">
					<ThemeUI.FormField label="Client Name" name="client_name" error={backendErrors.client_name} required>
						<ThemeUI.Input name="client_name" value={formData.client_name} onChange={handleInputChange} placeholder="Enter client name" />
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Company Name" name="company_name" error={backendErrors.company_name} required>
						<ThemeUI.Input name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Enter company name" />
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Domain" name="domain" error={backendErrors.domain} required>
						<ThemeUI.Input name="domain" value={formData.domain} onChange={handleInputChange} placeholder="example.com" />
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Server IP (Optional)" name="server_ip" error={backendErrors.server_ip}>
						<ThemeUI.Input name="server_ip" value={formData.server_ip} onChange={handleInputChange} placeholder="192.168.1.1" />
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Plan" name="plan" error={backendErrors.plan} required>
						<ThemeUI.Select
							name="plan"
							value={formData.plan}
							onChange={(opt) => setFormData(prev => ({ ...prev, plan: opt.value, expiry_on: opt.value === "lifetime" ? "" : prev.expiry_on }))}
							options={[
								{ value: "lifetime", label: "Lifetime" },
								{ value: "monthly", label: "Monthly" },
								{ value: "yearly", label: "Yearly" },
							]}
							placeholder="Select plan"
						/>
					</ThemeUI.FormField>
					{!isLifetime && (
						<ThemeUI.FormField label="Expiry Date" name="expiry_on" error={backendErrors.expiry_on} required>
							<ThemeUI.Input type="date" name="expiry_on" value={formData.expiry_on} onChange={handleInputChange} />
						</ThemeUI.FormField>
					)}
					<ThemeUI.FormField label="Status" name="status" error={backendErrors.status}>
						<ThemeUI.Select
							name="status"
							value={formData.status}
							onChange={(opt) => setFormData(prev => ({ ...prev, status: opt.value }))}
							options={[
								{ value: "active", label: "Active" },
								{ value: "suspended", label: "Suspended" },
								{ value: "terminated", label: "Terminated" },
							]}
							placeholder="Select status"
						/>
					</ThemeUI.FormField>
				</div>
				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button onClick={handleCancel} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button
						onClick={handleSaveLicense}
						disabled={isLoading}
						gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
						direction={theme.gradientDirection}
					>
						{isLoading ? (
							<> <Loader size={16} className="mr-2 animate-spin" /> Saving... </>
						) : editingLicense?.isNew ? "Create License" : "Update License"}
					</ThemeUI.Button>
				</div>
			</div>
		)
	}

	return (
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Licensing Management</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
						<li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Licensing</li>
					</ol>
				</nav>
			</div>

			<div className="mb-4 rounded-lg w-full">
				<div className="flex flex-col sm:flex-row justify-between items-center gap-2">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							value={searchQuery}
							onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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
						{licensingPermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
								<Plus size={16} className="mr-2" /> Add License
							</ThemeUI.Button>
						)}
					</div>
				</div>
			</div>

			<div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
				<AgGridReact
					ref={gridRef}
					className="custom-ag-grid"
					domLayout="autoHeight"
					theme={themeQuartz.withParams({ spacing: 7, headerHeight: 45, headerFontSize: 16, fontSize: 13, headerTextColor: "white" })}
					defaultColDef={{ resizable: true, sortable: true, filter: false }}
					columnDefs={columnDefs}
					rowData={licensings}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={(params) => {
						if (!params.api) return
						const newPage = params.api.paginationGetCurrentPage() + 1
						const newPageSize = params.api.paginationGetPageSize()
						if (newPage !== currentPage) setCurrentPage(newPage)
						if (newPageSize !== perPage) { setPerPage(newPageSize); setCurrentPage(1) }
					}}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Licenses Found" }}
					loading={isLoading}
				/>
			</div>

			<Modal isOpen={isModalOpen} onClose={handleCancel} title={editingLicense?.isNew ? "Add License" : "Edit License"} size="full">
				{renderLicenseForm()}
			</Modal>

			<Offcanvas isOpen={isFilterOffcanvasOpen} onClose={() => setIsFilterOffcanvasOpen(false)} title="Filter Options" position="right" size="md">
				<div className="space-y-4">
					<ThemeUI.FormField label="Status Filter">
						<ThemeUI.Select
							value={statusFilter ? { value: statusFilter, label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) } : null}
							onChange={(opt) => { setStatusFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "active", label: "Active" },
								{ value: "suspended", label: "Suspended" },
								{ value: "terminated", label: "Terminated" },
							]}
							placeholder="All statuses"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Plan Filter">
						<ThemeUI.Select
							value={planFilter ? { value: planFilter, label: planFilter.charAt(0).toUpperCase() + planFilter.slice(1) } : null}
							onChange={(opt) => { setPlanFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "lifetime", label: "Lifetime" },
								{ value: "monthly", label: "Monthly" },
								{ value: "yearly", label: "Yearly" },
							]}
							placeholder="All plans"
							isClearable
						/>
					</ThemeUI.FormField>
					<div className="flex gap-2">
						<ThemeUI.Button
							onClick={() => { setStatusFilter(""); setPlanFilter(""); setCurrentPage(1) }}
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

export default Licensing