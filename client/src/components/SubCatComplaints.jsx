import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Edit, Search, Filter, Plus, Trash2, Download } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'

function SubCatComplaints() {
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [subcategories, setSubcategories] = useState([])
	const [categories, setCategories] = useState([])
	const [editingSubcategory, setEditingSubcategory] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [categoryFilter, setCategoryFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by subcategory...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["subcategory", "category", "status", "creator"]

	const [formData, setFormData] = useState({
		category_id: "",
		subcategory: "",
		status: "1",
	})

	// Permissions
	const [subcategoryPermissions, setSubcategoryPermissions] = useState({
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
				if (permissions.subcatcomplaints) {
					return {
						can_add: permissions.subcatcomplaints.can_add || false,
						can_edit: permissions.subcatcomplaints.can_edit || false,
						can_delete: permissions.subcatcomplaints.can_delete || false,
						can_view: permissions.subcatcomplaints.can_view || false
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
		setSubcategoryPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			setSubcategoryPermissions(getUserPermissions())
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Typing Animation
	useEffect(() => {
		const tick = () => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex(prev => prev + 1)
			} else if (isDeleting && currentCharIndex > 0) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex(prev => prev - 1)
			} else if (!isDeleting && currentCharIndex === currentWord.length) {
				setTimeout(() => setIsDeleting(true), 1500)
			} else if (isDeleting && currentCharIndex === 0) {
				setIsDeleting(false)
				setCurrentWordIndex(prev => (prev + 1) % words.length)
			}
		}
		const timer = setInterval(tick, isDeleting ? 50 : 100)
		return () => clearInterval(timer)
	}, [currentCharIndex, currentWordIndex, isDeleting])

	// Fetch categories for dropdown
	const fetchCategories = useCallback(async () => {
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/category-complaints`, {
				params: { limit: 1000, page: 1, status: 1 }
			})
			if (response.data.success) {
				setCategories(response.data.data || [])
			}
		} catch (err) {
			console.error("Failed to fetch categories")
		}
	}, [])

	// Fetch paginated subcategories
	const fetchSubcategories = useCallback(async () => {
		if (!subcategoryPermissions.can_view) return
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subcategory-complaints`, {
				params: {
					page: currentPage,
					limit: perPage,
					search: searchQuery,
					status: statusFilter || "",
					category_id: categoryFilter || "",
				},
			})
			if (response.data.success) {
				setSubcategories(response.data.data || [])
				setTotalRows(response.data.total || 0)
			}
		} catch (err) {
			toast.error(err.response?.data?.message || "Failed to fetch subcategories")
			setSubcategories([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, categoryFilter, subcategoryPermissions.can_view])

	useEffect(() => {
		fetchCategories()
	}, [fetchCategories])

	useEffect(() => {
		fetchSubcategories()
	}, [fetchSubcategories])

	// FIXED: Excel Export - No more race condition
	const handleExcelExport = async () => {
		setIsLoading(true)
		try {
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subcategory-complaints`, {
				params: { limit: 10000, page: 1 }
			})

			if (!response.data.success) throw new Error("No data")

			const exportData = (response.data.data || []).map((subcat, index) => ({
				'S.No': index + 1,
				'Category': subcat.category?.category || '-',
				'Subcategory': subcat.subcategory,
				'Status': subcat.status === 1 ? 'Active' : 'Inactive',
				'Created By': subcat.creator ? (subcat.creator.name?.trim() || subcat.creator.email) : '-',
				'Updated By': subcat.updater ? (subcat.updater.name?.trim() || subcat.updater.email) : '-',
				'Created At': new Date(subcat.created_at).toLocaleString(),
				'Updated At': new Date(subcat.updated_at).toLocaleString()
			}))

			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 35 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }]
			XLSX.utils.book_append_sheet(wb, ws, 'Complaint Subcategories')
			const timestamp = new Date().toISOString().split('T')[0]
			XLSX.writeFile(wb, `complaint-subcategories_${timestamp}.xlsx`)
			toast.success('Excel exported successfully')
		} catch (error) {
			toast.error('Failed to export Excel')
		} finally {
			setIsLoading(false)
		}
	}

	// FIXED: Proper pagination handler (exactly like CatComplaints)
	const onPaginationChanged = useCallback(() => {
		if (!gridRef.current?.api) return

		const page = gridRef.current.api.paginationGetCurrentPage() + 1
		const pageSize = gridRef.current.api.paginationGetPageSize()

		if (page !== currentPage) {
			setCurrentPage(page)
		}
		if (pageSize !== perPage) {
			setPerPage(pageSize)
			setCurrentPage(1)
		}
	}, [currentPage, perPage])

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const columnDefs = useMemo(() => {
		const cols = [
			{ headerName: "S.No", width: 80, valueGetter: p => (currentPage - 1) * perPage + p.node.rowIndex + 1 },
			{ headerName: "Category", minWidth: 200, valueGetter: p => p.data.category?.category || '-' },
			{ headerName: "Subcategory", field: "subcategory", flex: 1, minWidth: 200 },
			{
				headerName: "Status",
				field: "status",
				width: 110,
				cellRenderer: p => (
					<span className={`px-2 py-1 rounded-full text-xs font-medium ${p.value === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
						{p.value === 1 ? "Active" : "Inactive"}
					</span>
				)
			},
			{ headerName: "Created By", minWidth: 180, valueGetter: p => p.data.creator ? (p.data.creator.name?.trim() || p.data.creator.email) : '-' },
			{ headerName: "Updated By", minWidth: 180, valueGetter: p => p.data.updater ? (p.data.updater.name?.trim() || p.data.updater.email) : '-' },
			{ headerName: "Created At", field: "created_at", width: 160, valueFormatter: p => new Date(p.value).toLocaleString() },
			{ headerName: "Updated At", field: "updated_at", width: 160, valueFormatter: p => new Date(p.value).toLocaleString() },
		]

		if (subcategoryPermissions.can_edit || subcategoryPermissions.can_delete) {
			cols.push({
				headerName: "Actions",
				width: 110,
				cellRenderer: p => (
					<div className="flex items-center gap-2 h-full">
						{subcategoryPermissions.can_edit && (
							<button onClick={() => handleEditClick(p.data)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit">
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{subcategoryPermissions.can_delete && (
							<button onClick={() => handleDeleteClick(p.data.id)} className="p-1 text-red-600 hover:text-red-800" title="Delete">
								<Trash2 size={16} />
							</button>
						)}
					</div>
				)
			})
		}
		return cols
	}, [currentPage, perPage, subcategoryPermissions, theme.primaryGradientStart])

	const categoryOptions = useMemo(() => {
		return categories.map(cat => ({
			value: cat.id.toString(),
			label: cat.category
		}))
	}, [categories])

	// CRUD Functions (unchanged, just moved down)
	const handleAddClick = () => {
		if (!subcategoryPermissions.can_add) return toast.error("No permission to add")
		setEditingSubcategory({ isNew: true })
		setFormData({ category_id: "", subcategory: "", status: "1" })
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (subcategory) => {
		if (!subcategoryPermissions.can_edit) return toast.error("No permission to edit")
		setEditingSubcategory(subcategory)
		setFormData({
			category_id: subcategory.category_id?.toString() || "",
			subcategory: subcategory.subcategory || "",
			status: subcategory.status == 1 ? "1" : "0",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveSubcategory = async () => {
		setIsSubmitting(true)
		try {
			const url = editingSubcategory?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/subcategory-complaints`
				: `${import.meta.env.VITE_API_URL}/admin/subcategory-complaints/${editingSubcategory.id}`
			const method = editingSubcategory?.isNew ? "post" : "put"
			const response = await axios[method](url, formData)
			if (response.data.success) {
				toast.success(editingSubcategory?.isNew ? "Created!" : "Updated!")
				fetchSubcategories()
				setIsModalOpen(false)
			}
		} catch (err) {
			if (err.response?.status === 400 && err.response.data.errors) {
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors")
			} else {
				toast.error(err.response?.data?.message || "Operation failed")
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDeleteClick = async (id) => {
		if (!subcategoryPermissions.can_delete) return toast.error("No permission")
		if (!window.confirm("Delete this subcategory permanently?")) return
		try {
			await axios.delete(`${import.meta.env.VITE_API_URL}/admin/subcategory-complaints/${id}`)
			toast.success("Deleted!")
			fetchSubcategories()
		} catch (err) {
			toast.error(err.response?.data?.message || "Delete failed")
		}
	}

	const handleCancel = () => {
		setIsModalOpen(false)
		setEditingSubcategory(null)
		setFormData({ category_id: "", subcategory: "", status: "1" })
		setBackendErrors({})
	}

	const handleCategoryChange = (option) => {
		setFormData(prev => ({ ...prev, category_id: option?.value || "" }))
		setBackendErrors(prev => ({ ...prev, category_id: "" }))
	}

	const handleStatusChange = (option) => {
		setFormData(prev => ({ ...prev, status: option.value }))
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const renderSubcategoryForm = () => (
		<div className="space-y-6 p-4">
			<div className="grid md:grid-cols-2 gap-6">
				<ThemeUI.FormField label="Category" name="category_id" error={backendErrors.category_id} required>
					<ThemeUI.Select
						value={formData.category_id}
						onChange={handleCategoryChange}
						options={categoryOptions}
						placeholder="Select category"
						error={!!backendErrors.category_id}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField label="Subcategory Name" name="subcategory" error={backendErrors.subcategory} required>
					<ThemeUI.Input
						name="subcategory"
						value={formData.subcategory}
						onChange={handleInputChange}
						placeholder="e.g., Excessive Volume"
						error={!!backendErrors.subcategory}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="grid md:grid-cols-2 gap-6">
				<ThemeUI.FormField label="Status" name="status" error={backendErrors.status} required>
					<ThemeUI.Select
						value={formData.status}
						onChange={handleStatusChange}
						options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]}
						placeholder="Select status"
						error={!!backendErrors.status}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
				<ThemeUI.Button onClick={handleCancel} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					onClick={handleSaveSubcategory}
					loading={isSubmitting}
					gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
					direction={theme.gradientDirection}
				>
					{editingSubcategory?.isNew ? "Create" : "Update"} Subcategory
				</ThemeUI.Button>
			</div>
		</div>
	)

	return (
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Complaint Subcategories</h1>
				<nav className="flex items-center text-sm text-gray-500">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600">Home</a></li>
						<li><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Complaint Subcategories</li>
					</ol>
				</nav>
			</div>

			<div className="mb-4">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							value={searchQuery}
							onChange={handleSearchChange}
							placeholder={placeholder}
							leftElement={<Search size={16} className="text-gray-400" />}
							className="bg-white border border-gray-300 rounded-md hover:border-gray-500"
						/>
					</div>
					<div className="flex gap-2 flex-wrap">
						<ThemeUI.Button onClick={handleExcelExport} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
							<Download size={16} className="mr-2" /> Export Excel
						</ThemeUI.Button>
						<ThemeUI.Button onClick={() => setIsFilterOffcanvasOpen(true)} gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}>
							<Filter size={16} className="mr-2" /> Filters
						</ThemeUI.Button>
						{subcategoryPermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
								<Plus size={16} className="mr-2" /> Add Subcategory
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
					theme={themeQuartz.withParams({
						spacing: 7,
						headerHeight: 45,
						headerFontSize: 16,
						fontSize: 13,
						headerTextColor: "white",
					})}
					defaultColDef={{ resizable: true }}
					columnDefs={columnDefs}
					rowData={subcategories}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={onPaginationChanged}  // This is the key fix!
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Subcategories Found" }}
					loading={isLoading}
				/>
			</div>

			<Modal isOpen={isModalOpen} onClose={handleCancel} title={editingSubcategory?.isNew ? "Add New Subcategory" : "Edit Subcategory"} size="xl">
				{renderSubcategoryForm()}
			</Modal>

			<Offcanvas isOpen={isFilterOffcanvasOpen} onClose={() => setIsFilterOffcanvasOpen(false)} title="Filter Subcategories" position="right" size="sm">
				<div className="space-y-6">
					<ThemeUI.FormField label="Category Filter">
						<ThemeUI.Select
							value={categoryFilter}
							onChange={(opt) => {
								setCategoryFilter(opt?.value || "")
								setCurrentPage(1)
							}}
							options={categoryOptions}
							placeholder="All categories"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Status Filter">
						<ThemeUI.Select
							value={statusFilter}
							onChange={(opt) => {
								setStatusFilter(opt?.value || "")
								setCurrentPage(1)
							}}
							options={[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]}
							placeholder="All statuses"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.Button
						onClick={() => {
							setStatusFilter("")
							setCategoryFilter("")
							setCurrentPage(1)
						}}
						gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
						className="w-full"
					>
						Reset Filters
					</ThemeUI.Button>
				</div>
			</Offcanvas>
		</Layout>
	)
}

export default SubCatComplaints