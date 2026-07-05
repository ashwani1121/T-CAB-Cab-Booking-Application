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
function Feedback(){
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [feedbacks, setFeedbacks] = useState([])
	const [editingFeedback, setEditingFeedback] = useState(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [ratingFilter, setRatingFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by feedback...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["feedback", "rating", "status"]
	const [formData, setFormData] = useState({
		feedback: "",
		rating: "",
		status: 1,
	})

	// Initialize permissions with safe defaults
	const [feedbackPermissions, setFeedbackPermissions] = useState({
		can_add: false,
		can_edit: false,
		can_delete: false,
		can_view: false
	})

	// Get user permissions for the feedback module 
	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions.feedback){
					return {
						can_add: permissions.feedback.can_add || false,
						can_edit: permissions.feedback.can_edit || false,
						can_delete: permissions.feedback.can_delete || false,
						can_view: permissions.feedback.can_view || false
					}
				}
			}
			return{
				can_add: false,
				can_edit: false,
				can_delete: false,
				can_view: false
			}
		}catch(error){
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
		setFeedbackPermissions(permissions)
	}, [getUserPermissions])

	// Listen for permission updates from other components
	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setFeedbackPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	// Fetch feedbacks on mount and when pagination/search/filter changes
	useEffect(() => {
		fetchFeedbacks(
			currentPage,
			perPage,
			searchQuery,
			statusFilter,
			ratingFilter
		)
	}, [currentPage, perPage, searchQuery, statusFilter, ratingFilter])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
		const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){ 
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			}else
			if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
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

	// Fetch feedbacks
	const fetchFeedbacks = useCallback(async () => {
		setIsLoading(true)
		try {
		const response = await axios.get(
			`${import.meta.env.VITE_API_URL}/admin/feedback`,
			{
			params: {
				page: currentPage,
				limit: perPage,
				search: searchQuery,
				status: statusFilter === "all" ? "" : statusFilter,
				rating: ratingFilter === "all" ? "" : ratingFilter,
			},
			}
		)
		if (response.data.success) {
			setFeedbacks(response.data.data)
			setTotalRows(response.data.total || 0)
		}
		} catch (err) {
		console.error("Error fetching feedbacks:", err)
		toast.error(err.response?.data?.message || "Failed to fetch feedbacks")
		setFeedbacks([])
		setTotalRows(0)
		} finally {
		setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter, ratingFilter])

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			// Prepare data for export
			const exportData = feedbacks.map((feedback, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Feedback': feedback.feedback,
				'Rating': feedback.rating,
				'Status': feedback.status === 1 ? 'Active' : 'Inactive',
				'Created At': new Date(feedback.created_at).toLocaleString(),
				'Updated At': new Date(feedback.updated_at).toLocaleString()
			}))
			// Create workbook and worksheet
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			// Set column widths
			ws['!cols'] = [
				{ wch: 8 },  // S.No
				{ wch: 50 }, // Feedback
				{ wch: 10 }, // Rating
				{ wch: 12 }, // Status
				{ wch: 20 }, // Created At
				{ wch: 20 }  // Updated At
			]
			// Add worksheet to workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Feedbacks')
			// Generate filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0]
			const filename  = `feedbacks_${timestamp}.xlsx`
			// Write file
			XLSX.writeFile(wb, filename)
			toast.success('Excel file exported successfully')
		}catch(error){
			console.error('Error exporting to Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [feedbacks, currentPage, perPage])

	// Handle add feedback button
	const handleAddClick = () => {
		if(!feedbackPermissions.can_add){
			toast.error("You don't have permission to create feedback")
			return
		}
		setEditingFeedback({ isNew: true })
		setFormData({
		feedback: "",
		rating: "",
		status: 1,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle edit feedback button
	const handleEditClick = (feedback) => {
		setEditingFeedback(feedback)
		setFormData({
		feedback: feedback.feedback || "",
		rating: feedback.rating || "",
		status: feedback.status === 1 || feedback.status === "1" ? 1 : 0,
		})
		setBackendErrors({})
		setIsModalOpen(true)
	}

	// Handle save feedback
	const handleSaveFeedback = async () => {
		setIsLoading(true)
		try {
		const url = editingFeedback?.isNew
			? `${import.meta.env.VITE_API_URL}/admin/feedback`
			: `${import.meta.env.VITE_API_URL}/admin/feedback/${editingFeedback.id}`
		const method = editingFeedback?.isNew ? "post" : "put"
		const submitData = {
			feedback: formData.feedback,
			rating: parseInt(formData.rating),
			status: parseInt(formData.status),
		}
		const response = await axios[method](url, submitData)
		if (response.data.success) {
			toast.success(
			editingFeedback?.isNew
				? "Feedback created successfully"
				: "Feedback updated successfully"
			)
			fetchFeedbacks(
			currentPage,
			perPage,
			searchQuery,
			statusFilter,
			ratingFilter
			)
			handleCancelEdit()
		}
		} catch (err) {
		if (err.response?.status === 400 && err.response.data.errors) {
			setBackendErrors(err.response.data.errors)
			toast.error("Please fix the errors in the form.")
		} else {
			toast.error(err.response?.data?.message || "Failed to save feedback")
		}
		} finally {
		setIsLoading(false)
		}
	}

	// Handle delete feedback
	const handleDeleteClick = async (feedback) => {
		if (!window.confirm(`Are you sure you want to delete this feedback?`))
		return
		setIsLoading(true)
		try {
		const response = await axios.delete(
			`${import.meta.env.VITE_API_URL}/admin/feedback/${feedback}`
		)
		if (response.data.success) {
			toast.success("Feedback deleted successfully")
			fetchFeedbacks(
			currentPage,
			perPage,
			searchQuery,
			statusFilter,
			ratingFilter
			)
		}
		} catch (err) {
		toast.error(err.response?.data?.message || "Failed to delete feedback")
		console.error("handleDeleteClick error:", err)
		} finally {
		setIsLoading(false)
		}
	}

	// Handle cancel edit
	const handleCancelEdit = () => {
		if(!feedbackPermissions.can_edit){
			toast.error("You don't have permission to edit feedback")
			return
		}
		setEditingFeedback(null)
		setFormData({
		feedback: "",
		rating: "",
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

	// Handle rating change
	const handleRatingChange = (selectedOption) => {
		setFormData((prev) => ({
		...prev,
		rating: selectedOption.value,
		}))
		setBackendErrors((prev) => ({ ...prev, rating: "" }))
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

    // DataTable columns - with conditional Actions column
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                width: 80,
                sortable: false,
                valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
            },
            {
                headerName: "Feedback",
                field: "feedback",
                sortable: true,
                minWidth: 120,
                flex: 1,
                cellRenderer: (params) => (
                    <div className="truncate max-w-xs" title={params.value}>
                    {params.value}
                    </div>
                ),
            },
            {
                headerName: "Rating",
                field: "rating",
                sortable: true,
                minWidth: 80,
                flex: 1,
                cellRenderer: (params) => (
                    <span className="text-yellow-500">
                    {"★".repeat(params.value) + "☆".repeat(5 - params.value)}
                    </span>
                ),
            },
            {
                headerName: "Status",
                field: "status",
                sortable: true,
                minWidth: 90,
                flex: 1,
                cellRenderer: (params) => (
                    <span
                    className={`px-2 py-1 rounded-full text-xs ${
                        params.value === 1
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
        if(feedbackPermissions.can_edit || feedbackPermissions.can_delete){
            baseColumns.push({
                headerName: "Actions",
                field: "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {feedbackPermissions.can_edit && (
                            <button
                                onClick={() => handleEditClick(params.data)}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit"
                            >
                                <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                            </button>
                        )}
                        {feedbackPermissions.can_delete && (
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
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, feedbackPermissions, handleEditClick, handleDeleteClick])

	// Render feedback form
	const renderFeedbackForm = () => {
		return (
		<div className="space-y-6 p-4">
			<div className="grid md:grid-cols-3 gap-4">
			<ThemeUI.FormField
				label="Feedback"
				name="feedback"
				error={backendErrors.feedback}
				required={true}
			>
				<ThemeUI.Input
				id="feedback"
				name="feedback"
				value={formData.feedback}
				onChange={handleInputChange}
				placeholder="Enter feedback comment"
				error={backendErrors.feedback}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField
				label="Rating"
				name="rating"
				error={backendErrors.rating}
				required={true}
			>
				<ThemeUI.Select
				id="rating"
				name="rating"
				value={formData.rating}
				onChange={handleRatingChange}
				options={[
					{ value: 1, label: "1 Star" },
					{ value: 2, label: "2 Stars" },
					{ value: 3, label: "3 Stars" },
					{ value: 4, label: "4 Stars" },
					{ value: 5, label: "5 Stars" },
				]}
				placeholder="Select rating"
				error={backendErrors.rating}
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
				onClick={handleSaveFeedback}
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
				) : editingFeedback?.isNew ? (
				"Create Feedback"
				) : (
				"Update Feedback"
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
			Feedback Management
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
				Feedback
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
				placeholder={placeholder}
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
				{feedbackPermissions.can_add && (
					<ThemeUI.Button
					type="button"
					onClick={handleAddClick}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
					aria-label="Add new feedback"
					>
					<Plus size={16} className="mr-2" /> Add Feedback
					</ThemeUI.Button>
				)}
			</div>
			</div>
		</div>
		{/* Datatable controls */}
		<div style={{"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
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
				defaultColDef={{
					resizable: true,
					sortable: true,
					filter: false,
				}}
				columnDefs={columnDefs}
				rowData={feedbacks}
				rowHeight={55}
				pagination={true}
				paginationPageSize={perPage}                    
				paginationPageSizeSelector={[10, 20, 50, 100]} 
				suppressPaginationPanel={false}
				onPaginationChanged={(params) => {
					if(!params.api) return;
					const newPage 	  = params.api.paginationGetCurrentPage() + 1;
					const newPageSize = params.api.paginationGetPageSize();
					let shouldRefetch = false;
					if(newPage !== currentPage){
						setCurrentPage(newPage);
						shouldRefetch = true;
					}
					if(newPageSize !== perPage){
						setPerPage(newPageSize);
						setCurrentPage(1);
						shouldRefetch = true;
					}
					if(shouldRefetch){
						params.api.gridOptionsWrapper.gridOptions.suppressScrollOnNewData = true;
						setTimeout(() => {
							gridRef.current?.api?.ensureIndexVisible(0);
						}, 100);
					}
				}}
				noRowsOverlayComponent={NoRowsOverlay}
				noRowsOverlayComponentParams={{ text: "No Feedbacks Found" }}
				loading={isLoading}
			/>
		</div>
		{/* Modal */}
		<Modal
			isOpen={isModalOpen}
			onClose={handleCancelEdit}
			title={editingFeedback?.isNew ? "Add Feedback" : "Edit Feedback"}
			size="full"
		>
			{renderFeedbackForm()}
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
					setCurrentPage(1)
				}}
				options={[
					{ value: "1", label: "Active" },
					{ value: "0", label: "Inactive" },
				]}
				placeholder="Filter by status"
				isClearable={true}
				/>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Rating Filter">
				<ThemeUI.Select
				value={
					ratingFilter
					? {
						value: ratingFilter,
						label: `${ratingFilter} Star${
							ratingFilter > 1 ? "s" : ""
						}`,
						}
					: null
				}
				onChange={(selectedOption) => {
					setRatingFilter(selectedOption?.value || "")
					setCurrentPage(1)
				}}
				options={[
					{ value: "1", label: "1 Star" },
					{ value: "2", label: "2 Stars" },
					{ value: "3", label: "3 Stars" },
					{ value: "4", label: "4 Stars" },
					{ value: "5", label: "5 Stars" },
				]}
				placeholder="Filter by rating"
				isClearable={true}
				/>
			</ThemeUI.FormField>
			<div className="flex gap-2">
				<ThemeUI.Button
				type="button"
				onClick={() => {
					setStatusFilter("")
					setRatingFilter("")
					setCurrentPage(1)
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
export default Feedback