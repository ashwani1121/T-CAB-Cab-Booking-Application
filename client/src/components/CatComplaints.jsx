import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
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

function CatComplaints(){

	const { theme } 								    	= useTheme()
	const gridRef 											= useRef(null)
	const [isModalOpen, setIsModalOpen] 					= useState(false)
	const [isLoading, setIsLoading] 						= useState(false)
	const [isSubmitting, setIsSubmitting] 					= useState(false)
	const [totalRows, setTotalRows] 						= useState(0)
	const [perPage, setPerPage] 							= useState(10)
	const [currentPage, setCurrentPage] 					= useState(1)
	const [categories, setCategories] 						= useState([])
	const [allCategories, setAllCategories] 				= useState([]) 
	const [editingCategory, setEditingCategory] 			= useState(null)
	const [searchQuery, setSearchQuery] 					= useState("")
	const [statusFilter, setStatusFilter] 					= useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] 				= useState({})
	const [placeholder, setPlaceholder] 					= useState("Search by category...")
	const [currentWordIndex, setCurrentWordIndex] 			= useState(0)
	const [currentCharIndex, setCurrentCharIndex] 			= useState(0)
	const [isDeleting, setIsDeleting] 						= useState(false)
	const words 											= ["category", "status", "creator"]
	const [formData, setFormData] 							= useState({
		category											: "",
		status												: "1",
	})

	// Permissions
	const [categoryPermissions, setCategoryPermissions] = useState({
		can_add		: false,
		can_edit	: false,
		can_delete	: false,
		can_view	: false
	})

	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.catcomplaints){
					return{
						can_add		: permissions.catcomplaints.can_add || false,
						can_edit	: permissions.catcomplaints.can_edit || false,
						can_delete	: permissions.catcomplaints.can_delete || false,
						can_view	: permissions.catcomplaints.can_view || false
					}
				}
			}
			return { 
				can_add		: false, 
				can_edit	: false, 
				can_delete	: false, 
				can_view	: false 
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return { can_add: false, can_edit: false, can_delete: false, can_view: false }
		}
	}, [])

	useEffect(() => {
		const permissions = getUserPermissions()
		setCategoryPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			setCategoryPermissions(getUserPermissions())
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	// Typing Animation 
	useEffect(() => {
		const tick = () => {
			const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex(prev => prev + 1)
			}else 
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex(prev => prev - 1)
			}else 
			if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), 1500)
			}else 
			if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex(prev => (prev + 1) % words.length)
			}
		}
		const timer = setInterval(tick, isDeleting ? 50 : 100)
		return () => clearInterval(timer)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Fetch paginated data
	const fetchCategories = useCallback(async () => {
		if(!categoryPermissions.can_view) return
		setIsLoading(true)
		try{
			const response  = await axios.get(`${import.meta.env.VITE_API_URL}/admin/category-complaints`, {
				params		: {
					page	: currentPage,
					limit	: perPage,
					search	: searchQuery,
					status	: statusFilter === "all" ? "" : statusFilter,
				},
			})
			if(response.data.success){
				setCategories(response.data.data || [])
				setTotalRows(response.data.total || 0)
			}
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to fetch categories")
			setCategories([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, categoryPermissions.can_view])

	// Fetch ALL categories for Excel export
	const fetchAllCategories = useCallback(async () => {
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/category-complaints`, {
				params: { limit: 10000, page: 1 }
			})
			if(response.data.success){
				setAllCategories(response.data.data || [])
			}
		}catch(err){
			console.error("Failed to fetch all categories for export")
		}
	}, [])

	useEffect(() => {
		fetchCategories()
	}, [fetchCategories])

	// Excel Export - Full Data
	const handleExcelExport = useCallback(async () => {
		setIsLoading(true)
		try{
			await fetchAllCategories()
			// Wait a tick for state update
			setTimeout(() => {
				const exportData 	= (allCategories.length > 0 ? allCategories : categories).map((cat, index) => ({
					'S.No'			: index + 1,
					'Category'		: cat.category,
					'Status'		: cat.status === 1 ? 'Active' : 'Inactive',
					'Created By'	: cat.creator ? (cat.creator.name?.trim() || cat.creator.email) : '-',
					'Updated By'	: cat.updater ? (cat.updater.name?.trim() || cat.updater.email) : '-',
					'Created At'	: new Date(cat.created_at).toLocaleString(),
					'Updated At'	: new Date(cat.updated_at).toLocaleString()
				}))
				const wb 			= XLSX.utils.book_new()
				const ws 			= XLSX.utils.json_to_sheet(exportData)
				ws['!cols'] 		= [{ wch: 8 }, { wch: 35 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }]
				XLSX.utils.book_append_sheet(wb, ws, 'Complaint Categories')
				const timestamp 	= new Date().toISOString().split('T')[0]
				XLSX.writeFile(wb, `complaint-categories_${timestamp}.xlsx`)
				toast.success('Excel exported successfully')
			}, 100)
		}catch(error){
			toast.error('Failed to export Excel')
		}finally{
			setIsLoading(false)
		}
	}, [allCategories, categories, fetchAllCategories])

	// CRUD Handlers with Permission Checks
	const handleAddClick = () => {
		if(!categoryPermissions.can_add){
			toast.error("You don't have permission to add categories")
			return
		}
		setEditingCategory({ isNew: true })
		setFormData({ category: "", status: "1" })
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleEditClick = (category) => {
		if(!categoryPermissions.can_edit){
			toast.error("You don't have permission to edit categories")
			return
		}
		setEditingCategory(category)
		setFormData({
			category: category.category || "",
			status: category.status == 1 ? "1" : "0",
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	const handleSaveCategory = async () => {
		setIsSubmitting(true)
		try{
			const url      = editingCategory?.isNew
				? `${import.meta.env.VITE_API_URL}/admin/category-complaints`
				: `${import.meta.env.VITE_API_URL}/admin/category-complaints/${editingCategory.id}`
			const method   = editingCategory?.isNew ? "post" : "put"
			const response = await axios[method](url, formData)
			if(response.data.success){
				toast.success(editingCategory?.isNew ? "Category created successfully" : "Category updated successfully")
				fetchCategories()
				setIsModalOpen(false)
				setEditingCategory(null)
			}
		}catch(err){
			if(err.response?.status === 400 && err.response.data.errors){
				setBackendErrors(err.response.data.errors)
				toast.error("Please fix the errors below")
			}else{
				toast.error(err.response?.data?.message || "Operation failed")
			}
		}finally{
			setIsSubmitting(false)
		}
	}

	const handleDeleteClick = async (id) => {
		if(!categoryPermissions.can_delete){
			toast.error("You don't have permission to delete categories")
			return
		}
		if(!window.confirm("Are you sure you want to delete this category permanently?")) return
		try{
			await axios.delete(`${import.meta.env.VITE_API_URL}/admin/category-complaints/${id}`)
			toast.success("Category deleted successfully")
			fetchCategories()
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to delete category")
		}
	}

	const handleCancel = () => {
		setIsModalOpen(false)
		setEditingCategory(null)
		setFormData({ category: "", status: "1" })
		setBackendErrors({})
	}

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: "" }))
	}

	const handleStatusChange = (option) => {
		setFormData(prev => ({ ...prev, status: option.value }))
		setBackendErrors(prev => ({ ...prev, status: "" }))
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	// Proper pagination handler
	const handlePaginationChanged = useCallback((event) => {
		if(!event.api) return
		const newPage     = event.api.paginationGetCurrentPage() + 1
		const newPageSize = event.api.paginationGetPageSize()
		// Only update if values actually changed
		if(newPage !== currentPage){
			setCurrentPage(newPage)
		}
		if(newPageSize !== perPage){
			setPerPage(newPageSize)
			setCurrentPage(1) 
		}
	}, [currentPage, perPage])

	const columnDefs = useMemo(() => {
		const cols = [
			{ headerName: "S.No", width: 80, valueGetter: p => (currentPage - 1) * perPage + p.node.rowIndex + 1 },
			{ headerName: "Category", field: "category", flex: 1, minWidth: 200 },
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
		if(categoryPermissions.can_edit || categoryPermissions.can_delete){
			cols.push({
				headerName: "Actions",
				width: 110,
				cellRenderer: p => (
					<div className="flex items-center gap-2 h-full">
						{categoryPermissions.can_edit && (
							<button onClick={() => handleEditClick(p.data)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit">
								<Edit size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						)}
						{categoryPermissions.can_delete && (
							<button onClick={() => handleDeleteClick(p.data.id)} className="p-1 text-red-600 hover:text-red-800" title="Delete">
								<Trash2 size={16} />
							</button>
						)}
					</div>
				)
			})
		}
		return cols
	}, [currentPage, perPage, categoryPermissions, theme.primaryGradientStart])

	const renderCategoryForm = () => (
		<div className="space-y-6 p-4">
			<div className="grid md:grid-cols-2 gap-6">
				<ThemeUI.FormField 
					label			= "Category Name" 
					name			= "category"
					error			= {backendErrors.category} 
					required
				>
					<ThemeUI.Input
						name		= "category"
						value		= {formData.category}
						onChange	= {handleInputChange}
						placeholder	= "e.g., Noise Complaint, Parking Issue"
						error		= {!!backendErrors.category}
					/>
				</ThemeUI.FormField>
				<ThemeUI.FormField 
					label			= "Status" 
					name			= "status" 
					error			= {backendErrors.status} 
					required
				>
					<ThemeUI.Select
						value		= {formData.status}
						onChange	= {handleStatusChange}
						options		= {[
							{ value: "1", label: "Active" },
							{ value: "0", label: "Inactive" },
						]}
						placeholder	= "Select status"
						error		= {!!backendErrors.status}
					/>
				</ThemeUI.FormField>
			</div>
			<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
				<ThemeUI.Button 
					onClick			= {handleCancel} 
					gradientColors	= {{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button
					onClick			= {handleSaveCategory}
					loading			= {isSubmitting}
					gradientColors	= {{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
					direction		= {theme.gradientDirection}
				>
					{isSubmitting ? <>Saving...</> : editingCategory?.isNew ? "Create Category" : "Update Category"}
				</ThemeUI.Button>
			</div>
		</div>
	)

	return(
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Complaint Categories</h1>
				<nav className="flex items-center text-sm text-gray-500">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600">Home</a></li>
						<li><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Complaint Categories</li>
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
						{categoryPermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
								<Plus size={16} className="mr-2" /> Add Category
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
					rowData={categories}
					rowHeight={55}
					pagination={true}
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={handlePaginationChanged}
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Categories Found" }}
					loading={isLoading}
				/>
			</div>
			<Modal 
				isOpen		= {isModalOpen} 
				onClose		= {handleCancel} 
				title		= {editingCategory?.isNew ? "Add New Category" : "Edit Category"} 
				size		= "xl"
			>
				{renderCategoryForm()}
			</Modal>
			<Offcanvas 
				isOpen		= {isFilterOffcanvasOpen} 
				onClose		= {() => setIsFilterOffcanvasOpen(false)} 
				title		= "Filter Categories" 
				position	= "right" 
				size		= "sm"
			>
				<div className="space-y-6">
					<ThemeUI.FormField label="Status Filter">
						<ThemeUI.Select
							value		= {statusFilter}
							onChange	= {(opt) => {
								setStatusFilter(opt?.value || "")
								setCurrentPage(1)
							}}
							options		= {[{ value: "1", label: "Active" }, { value: "0", label: "Inactive" }]}
							placeholder	= "All statuses"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.Button
						onClick			= {() => { setStatusFilter(""); setCurrentPage(1) }}
						gradientColors	= {{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
						className		= "w-full"
					>
						Reset Filters
					</ThemeUI.Button>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default CatComplaints