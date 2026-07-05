import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Paperclip, Download, User, UserPlus, UserMinus, Shield, Info } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'
function Complaints(){
	const { theme } 												  = useTheme()
	const gridRef 													  = useRef(null)
	const [isModalOpen, setIsModalOpen] 							  = useState(false)
	const [isAssignModalOpen, setIsAssignModalOpen] 				  = useState(false)
	const [isViewAssignmentsModalOpen, setIsViewAssignmentsModalOpen] = useState(false)
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] 		  = useState(false)
	const [isLoading, setIsLoading] 								  = useState(false)
	const [isSubmitting, setIsSubmitting] 							  = useState(false)
	const [totalRows, setTotalRows] 								  = useState(0)
	const [perPage, setPerPage] 									  = useState(10)
	const [currentPage, setCurrentPage] 							  = useState(1)
	const [complaints, setComplaints] 								  = useState([])
	const [allComplaints, setAllComplaints]							  = useState([])
	const [categories, setCategories] 								  = useState([])
	const [subcategories, setSubcategories] 						  = useState([])
	const [editingComplaint, setEditingComplaint] 					  = useState(null)
	const [assigningComplaint, setAssigningComplaint] 				  = useState(null)
	const [viewingAssignments, setViewingAssignments] 				  = useState(null)
	const [searchQuery, setSearchQuery] 							  = useState("")
	const [ticketNoFilter, setTicketNoFilter] 						  = useState("")
	const [statusFilter, setStatusFilter] 							  = useState("")
	const [categoryFilter, setCategoryFilter] 						  = useState("")
	const [subcategoryFilter, setSubcategoryFilter] 				  = useState("")
	const [userTypeFilter, setUserTypeFilter] 						  = useState("")
	const [ownerFilter, setOwnerFilter] 							  = useState("")
	const [backendErrors, setBackendErrors] 						  = useState({})
	const [isSuperAdmin, setIsSuperAdmin] 							  = useState(false)
	const [canAssignComplaints, setCanAssignComplaints] 			  = useState(false)
	const [stateFilter, setStateFilter] 							  = useState("")
	const [pickupStateFilter, setPickupStateFilter] 				  = useState("")
	const [dropoffStateFilter, setDropoffStateFilter] 				  = useState("")
	const [states, setStates] 										  = useState([])
	const [selectedUser, setSelectedUser] 							  = useState(null)
	const [selectedRide, setSelectedRide] 							  = useState(null)
	const [selectedTeamMembers, setSelectedTeamMembers] 			  = useState([])
	const [assignmentNotes, setAssignmentNotes] 					  = useState("")
	const [placeholder, setPlaceholder] 							  = useState("Search by title...")
	const [currentWordIndex, setCurrentWordIndex] 					  = useState(0)
	const [currentCharIndex, setCurrentCharIndex] 					  = useState(0)
	const [isDeleting, setIsDeleting] 								  = useState(false)
	const [attachmentFiles, setAttachmentFiles] 					  = useState([])
	const words 													  = ["title", "ticket number", "description", "category", "status"]
	const [formData, setFormData] 									  = useState({
		title														  : "",
		description													  : "",
		custom_query												  : "", 
		category_id													  : "",
		subcategory_id												  : "",
		user_type													  : "",
		user_id														  : "",
		ride_id														  : "",
		status														  : "pending",
		resolution_notes											  : ""
	})
	const [complaintPermissions, setComplaintPermissions] 			  = useState({
		can_add														  : false,
		can_edit													  : false,
		can_delete													  : false,
		can_view													  : false
	})

	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr   = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions  = JSON.parse(permissionsStr)
				if(permissions.complaints){ 
					return{
						can_add    : permissions.complaints.can_add || false,
						can_edit   : permissions.complaints.can_edit || false,
						can_delete : permissions.complaints.can_delete || false,
						can_view   : permissions.complaints.can_view || false
					}
				}
			}
		}catch(error){
			console.error('Error parsing user permissions:', error)
		}
		return { can_add: false, can_edit: false, can_delete: false, can_view: false }
	}, [])

	useEffect(() => {
		const permissions = getUserPermissions()
		setComplaintPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			setComplaintPermissions(getUserPermissions())
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
	}, [getUserPermissions])

	const fetchFilterOptions = useCallback(async () => {
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints/filter-options`)
			if(response.data.success){
				setCategories(response.data.data.categories || [])
				setStates(response.data.data.states || [])
			}
			const subRes = await axios.get(`${import.meta.env.VITE_API_URL}/admin/subcategory-complaints?limit=1000`)
			setSubcategories(subRes.data.data || [])
		}catch(err){
			console.error("Failed to load filter options")
		}
	}, [])

	const fetchComplaints = useCallback(async () => {
		if(!complaintPermissions.can_view) return
		setIsLoading(true)
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints`, {
				params				 : {
					page			 : currentPage,
					limit			 : perPage,
					search			 : searchQuery,
					ticket_no		 : ticketNoFilter || undefined,
					status			 : statusFilter || undefined,
					category_id		 : categoryFilter || undefined,
					subcategory_id	 : subcategoryFilter || undefined,
					user_type		 : userTypeFilter || undefined,
					owner_id		 : ownerFilter || undefined,
					state_id		 : stateFilter || undefined,              
					pickup_state_id  : pickupStateFilter || undefined,  
					dropoff_state_id : dropoffStateFilter || undefined 
				}
			})
			if(response.data.success){
				setComplaints(response.data.data || [])
				setTotalRows(response.data.pagination?.total || response.data.total || 0)
				setIsSuperAdmin(response.data.visibility?.is_super_admin || false)
				setCanAssignComplaints(response.data.visibility?.has_assigned_permission || false)
			}
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to fetch complaints")
			setComplaints([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, ticketNoFilter, statusFilter, categoryFilter, subcategoryFilter, userTypeFilter, ownerFilter, stateFilter, pickupStateFilter, dropoffStateFilter, complaintPermissions.can_view])

	const fetchAllComplaints = useCallback(async () => {
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints`, {
				params: { limit: 10000, page: 1 }
			})
			if(response.data.success){
				setAllComplaints(response.data.data || [])
			}
		}catch(err){
			console.error("Failed to fetch all complaints for export")
		}
	}, [])

	useEffect(() => {
		fetchFilterOptions()
	}, [fetchFilterOptions])

	useEffect(() => {
		fetchComplaints()
	}, [fetchComplaints])

	useEffect(() => {
		return () => {
			// Cleanup all blob URLs on unmount
			attachmentFiles.forEach(file => {
				if (file.preview?.startsWith('blob:')) {
					URL.revokeObjectURL(file.preview)
				}
			})
		}
	}, [attachmentFiles])

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
	}, [currentCharIndex, currentWordIndex, isDeleting])

	const loadUsers = useCallback(async (inputValue, callback) => {
		if(!formData.user_type){
			callback([]);
			return;
		}
		if(inputValue.length < 2){
			callback([]);
			return;
		}
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints/search-users`, {
				params: {
					search: inputValue,
					user_type: formData.user_type
				}
			});
			if(response.data.success){
				const options = response.data.data.map(user => ({ 
					value: user.id,
					label: `${user.name || 'No Name'} (${user.mobile || user.email || 'No contact'})`,
					user: user 
				}));
				callback(options);
			}else{
				callback([]);
			}
		}catch(err){
			console.error("Failed to load users:", err);
			toast.error("Failed to search users");
			callback([]);
		}
	}, [formData.user_type]);

	const loadRides = useCallback(async (inputValue, callback) => {
		if(!formData.user_id || !formData.user_type){
			callback([]);
			return;
		}
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints/user-rides`, {
				params: {
					user_id: formData.user_id,
					user_type: formData.user_type,
					search: inputValue || undefined 
				}
			});
			if(response.data.success){
				const options = response.data.data.map(ride => ({
					value: ride.id,
					label: `Ride #${ride.ride_number || ride.id} | ${ride.pickup_address?.substring(0, 30) || 'N/A'} → ${ride.dropoff_address?.substring(0, 30) || 'N/A'} | ${ride.status?.toUpperCase()}`,
					ride: ride
				}));
				callback(options);
			}else{
				callback([]);
			}
		}catch(err){
			console.error("Failed to load rides:", err);
			toast.error("Failed to load rides");
			callback([]);
		}
	}, [formData.user_id, formData.user_type]);

	const loadTeamMembers = useCallback(async (inputValue, callback) => {
		if(inputValue.length < 2){
			callback([]);
			return;
		}
		try{
			const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/complaints/search-team-members`, {
				params: { search: inputValue }
			});
			if(response.data.success){
				const options = response.data.data.map(member => ({
					value: member.id,
					label: `${member.name} (${member.email})`
				}));
				callback(options);
			}else{
				callback([]);
			}
		}catch(err){
			console.error("Failed to load team members:", err);
			toast.error("Failed to search team members");
			callback([]);
		}
	}, []);

	const handleExcelExport = useCallback(async () => {
		setIsLoading(true)
		try{
			await fetchAllComplaints()
			setTimeout(() => {
				const data 		 = allComplaints.length > 0 ? allComplaints : complaints
				const exportData = data.map((c, i) => ({
					'S.No'				: i + 1,
					'Ticket No'			: c.ticket_no,
					'Title'				: c.title,
					'Description'		: c.description || '-',
					'Custom Query'		: c.custom_query || '-',
					'Category'			: c.category?.category || '-',
					'Subcategory'		: c.subcategory?.subcategory || '-',
					'User Type'			: c.user_type ? c.user_type.toUpperCase() : '-',
					'User'				: c.passenger?.name || c.passenger?.email || 'Unknown',
					'Ride ID'			: c.ride_id || '-',
					'Owner'				: c.owner?.name || 'Unassigned',
					'Assigned To'		: c.assignments?.filter(a => a.is_active).map(a => a.assignedUser?.name).join(', ') || 'None',
					'Status'			: c.status.replace('_', ' ').toUpperCase(),
					'Resolver'			: c.resolver?.name || '-',
					'Resolution Notes'	: c.resolution_notes || '-',
					'Created At'		: new Date(c.created_at).toLocaleString(),
					'Updated At'		: new Date(c.updated_at).toLocaleString(),
				}))
				const wb 		= XLSX.utils.book_new()
				const ws 		= XLSX.utils.json_to_sheet(exportData)
				ws['!cols'] 	= Array(17).fill({ wch: 20 })
				XLSX.utils.book_append_sheet(wb, ws, 'Complaints')
				const timestamp = new Date().toISOString().split('T')[0]
				XLSX.writeFile(wb, `complaints_${timestamp}.xlsx`)
				toast.success('Excel exported successfully')
				setAllComplaints([])
			}, 100)
		}catch(err){
			toast.error('Failed to export Excel')
		}finally{
			setIsLoading(false)
		}
	}, [allComplaints, complaints, fetchAllComplaints])

	const handleAddClick = () => {
		if(!complaintPermissions.can_add) return toast.error("No permission to add")
		setEditingComplaint({ isNew: true })
		setFormData({
			title			: "",
			description		: "",
			custom_query	: "",
			category_id		: "",
			subcategory_id	: "",
			user_type		: "",
			user_id			: "",
			ride_id			: "",
			status			: "pending",
			resolution_notes: ""
		})
		setSelectedUser(null)
		setSelectedRide(null)
		setBackendErrors({})
    	setAttachmentFiles([])
		setIsModalOpen(true)
	}

	const handleEditClick = (complaint) => {
		if(!complaintPermissions.can_edit) return toast.error("No permission to edit")
		setEditingComplaint(complaint)
		setFormData({
			title: complaint.title || "",
			description: complaint.description || "",
			custom_query: complaint.custom_query || "",
			category_id: complaint.category_id || "",
			subcategory_id: complaint.subcategory_id || "",
			user_type: complaint.user_type || "",
			user_id: complaint.user_id || "",
			ride_id: complaint.ride_id || "",
			status: complaint.status || "pending",
			resolution_notes: complaint.resolution_notes || ""
		})
		setSelectedUser(complaint.passenger ? {
			value: complaint.user_id,
			label: `${complaint.passenger.name || 'No Name'} (${complaint.passenger.mobile || complaint.passenger.email || 'No contact'})`
		} : null)
		setSelectedRide(complaint.ride ? {
			value: complaint.ride_id,
			label: `Ride #${complaint.ride.id} - ${complaint.ride.pickup_address?.substring(0, 30)} → ...`
		} : null)
		setBackendErrors({})
		const existingAttachments = (complaint.attachments || []).map(att => {
			// Get the path from backend - it should be relative like 'uploads/complaints/...'
			let filePath = att.path || att.filename || ''
			// Remove leading slash if present
			filePath = filePath.replace(/^\/+/, '')
			// Construct clean URL without double slashes
			const baseUrl = import.meta.env.VITE_API_URL.replace(/\/+$/, '') // Remove trailing slashes
			const fullUrl = `${baseUrl}/${filePath}`
			return {
				name: att.originalName || att.filename || filePath.split('/').pop() || 'unknown',
				size: att.size || 0,
				type: att.mimetype || att.type || '',
				url: fullUrl,
				path: filePath, // Keep clean path for backend
				isExisting: true,
				preview: att.mimetype?.startsWith('image/') ? fullUrl : null
			}
		})
		setAttachmentFiles(existingAttachments)
		setIsModalOpen(true)
	}

	const handleAttachmentChange = (e) => {
		const files = Array.from(e.target.files || []).filter(
			(file) => file instanceof File
		)
		if (files.length > 0) {
			const currentCount = attachmentFiles.length
			const availableSlots = 5 - currentCount
			if (files.length > availableSlots) {
				toast.warning(`You can only upload ${availableSlots} more file(s).`)
			}
			const newFiles = files.slice(0, availableSlots).map((file) => ({
				name: file.name,
				size: file.size,
				type: file.type,
				preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
				file: file,
				isExisting: false
			}))
			setAttachmentFiles(prev => [...prev, ...newFiles])
			setBackendErrors(prev => ({ ...prev, attachments: undefined }))
			e.target.value = "" // Reset file input
		}
	}

	const handleAttachmentDelete = (index) => {
		setAttachmentFiles(prev => {
			const updated = [...prev]
			const file = updated[index]
			// Revoke blob URL if it exists
			if (file.preview?.startsWith('blob:')) {
				URL.revokeObjectURL(file.preview)
			}
			updated.splice(index, 1)
			return updated
		})
		setBackendErrors(prev => ({ ...prev, attachments: undefined }))
	}

	const handleAssignClick = (complaint) => {
		setAssigningComplaint(complaint)
		setSelectedTeamMembers([])
		setAssignmentNotes("")
		setIsAssignModalOpen(true)
	}

	const handleViewAssignments = (complaint) => {
		setViewingAssignments(complaint)
		setIsViewAssignmentsModalOpen(true)
	}

	const handleSaveAssignment = async () => {
		if(selectedTeamMembers.length === 0){
			return toast.error("Please select at least one team member")
		}
		setIsSubmitting(true)
		try{
			const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/complaints/${assigningComplaint.id}/assign`,{
					assigned_to: selectedTeamMembers.map(m => m.value),
					notes: assignmentNotes.trim() || null
				}
			)
			if(response.data.success){
				toast.success("Team members assigned successfully")
				setIsAssignModalOpen(false)
				setAssigningComplaint(null)
				setSelectedTeamMembers([])
				setAssignmentNotes("")
				fetchComplaints()
			}
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to assign complaint")
		}finally{
			setIsSubmitting(false)
		}
	}

	const handleUnassign = async (complaintId, assignmentIds) => {
		if(!window.confirm("Remove selected assignments? This will make the complaint visible to all team members if no assignments remain.")) return
		try{
			const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/complaints/${complaintId}/unassign`,
				{ assignment_ids: assignmentIds }
			)
			if(response.data.success){
				toast.success("Assignment removed successfully")
				setIsViewAssignmentsModalOpen(false)
				setViewingAssignments(null)
				fetchComplaints()
			}
		}catch(err){
			toast.error(err.response?.data?.message || "Failed to remove assignment")
		}
	}

	const handleSaveComplaint = async () => {
		setIsSubmitting(true)
		try {
			const submitData = new FormData()
			
			// Add form fields
			submitData.append('title', formData.title)
			submitData.append('description', formData.description || '')
			submitData.append('custom_query', formData.custom_query?.trim() || '')
			submitData.append('category_id', formData.category_id)
			submitData.append('subcategory_id', formData.subcategory_id || '')
			submitData.append('user_type', formData.user_type)
			submitData.append('user_id', formData.user_id)
			submitData.append('ride_id', formData.ride_id)
			
			if (!editingComplaint?.isNew) {
				submitData.append('status', formData.status)
				submitData.append('resolution_notes', formData.resolution_notes || '')
			}
			
			// CRITICAL FIX: Add new files
			attachmentFiles.forEach(fileObj => {
				if (!fileObj.isExisting && fileObj.file) {
					submitData.append('attachments', fileObj.file)
				}
			})
			
			// CRITICAL FIX: Send existing attachment paths (not full URLs)
			const existingAttachments = attachmentFiles
				.filter(f => f.isExisting)
				.map(f => f.path) // Use path, not url
			
			if (existingAttachments.length > 0) {
				submitData.append('existing_attachments', JSON.stringify(existingAttachments))
			}
			
			let res
			if (editingComplaint.isNew) {
				res = await axios.post(
					`${import.meta.env.VITE_API_URL}/admin/complaints`,
					submitData,
					{ headers: { 'Content-Type': 'multipart/form-data' } }
				)
			} else {
				submitData.append('_method', 'PUT')
				res = await axios.post(
					`${import.meta.env.VITE_API_URL}/admin/complaints/${editingComplaint.id}`,
					submitData,
					{ headers: { 'Content-Type': 'multipart/form-data' } }
				)
			}
			
			if (res.data.success) {
				toast.success(editingComplaint.isNew ? "Complaint created" : "Complaint updated")
				
				// Clean up blob URLs
				attachmentFiles.forEach(file => {
					if (file.preview?.startsWith('blob:')) {
						URL.revokeObjectURL(file.preview)
					}
				})
				
				setIsModalOpen(false)
				setEditingComplaint(null)
				setAttachmentFiles([])
				fetchComplaints()
			}
		} catch (err) {
			if (err.response?.data?.errors) {
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
		if(!complaintPermissions.can_delete) return toast.error("No permission to delete")
		if(!window.confirm("Delete this complaint permanently?")) return
		try{
			await axios.delete(`${import.meta.env.VITE_API_URL}/admin/complaints/${id}`)
			toast.success("Complaint deleted")
			fetchComplaints()
		}catch(err){
			toast.error(err.response?.data?.message || "Delete failed")
		}
	}

	const handleCancel = () => {
		setIsModalOpen(false)
		setEditingComplaint(null)
		setSelectedUser(null)
		setSelectedRide(null)
		setBackendErrors({})
	}

	const STATUS_CONFIG = {
		open: { 
			color: '#3B82F6', 
			bgClass: 'bg-blue-100 text-blue-800',
			label: 'OPEN',
			description: 'Ticket is newly created and awaiting review'
		},
		resolved: { 
			color: '#10B981', 
			bgClass: 'bg-green-100 text-green-800',
			label: 'RESOLVED',
			description: 'Issue has been addressed and resolved'
		},
		escalate: { 
			color: '#F59E0B', 
			bgClass: 'bg-amber-100 text-amber-800',
			label: 'ESCALATED',
			description: 'Ticket has been escalated to higher authority'
		},
		closed: { 
			color: '#6B7280', 
			bgClass: 'bg-gray-100 text-gray-800',
			label: 'CLOSED',
			description: 'Ticket is closed and no further action needed'
		},
		reopen: { 
			color: '#EF4444', 
			bgClass: 'bg-red-100 text-red-800',
			label: 'REOPENED',
			description: 'Previously closed ticket has been reopened'
		}
	};

	const isOthersCategory = useMemo(() => {
		if(!formData.category_id) return false
		const category = categories.find(c => c.id == formData.category_id)
		return category?.category?.toLowerCase() === 'others'
	}, [formData.category_id, categories])

	const columnDefs = useMemo(() => {
		const cols   = [ 
			{ headerName: "S.No", width: 80, valueGetter: p => (currentPage - 1) * perPage + p.node.rowIndex + 1 },
			{ headerName: "Title", field: "title", flex: 1, minWidth: 280, tooltipField: "title",
				cellRenderer: p => (
					<div className="flex items-center gap-2">
						<div 
							className="w-1 h-10 rounded" 
							style={{ backgroundColor: p.data.status_color || STATUS_CONFIG[p.data.status]?.color }}
						/>
						<span className="font-medium">{p.value}</span>
					</div>
				)
			},
			{ headerName: "Ticket No", field: "ticket_no", minWidth: 150 },
			{ headerName: "Category", field: "category.category", minWidth: 150 },
			{ headerName: "Subcategory", field: "subcategory.subcategory", minWidth: 170 },
			{ headerName: "Passenger", minWidth: 160,
				cellRenderer: p => (
					<div className="flex items-center gap-2">
						<User size={14} className="text-gray-500" />
						<span>{p.data.passenger?.name || p.data.passenger?.email || 'Unknown'}</span>
					</div>
				)
			},
			{ headerName: "Owner/Assigned",minWidth: 180,
				cellRenderer: p => {
					const activeAssignments = p.data.assignments?.filter(a => a.is_active) || []
					const hasAssignments    = activeAssignments.length > 0
					const owner             = p.data.owner?.name || 'Unassigned'
					return(
						<div className="flex items-center gap-2">
							{hasAssignments && canAssignComplaints ? (
								<>
									<UserPlus size={14} className="text-gray-500"  />
									<button
										onClick={() => handleViewAssignments(p.data)}
										className=" hover:underline text-sm "
										title="View assignments"
									>
										{owner} +{activeAssignments.length}
									</button>
								</>
							) : (
								<>
									<User size={14} className="text-gray-400" />
									<span className="text-gray-500 text-sm italic">{owner}</span>
								</>
							)}
						</div>
					)
				}
			},
			{ headerName: "Resolver", valueGetter: p => p.data.resolver?.name || '-', minWidth: 140 },
			{ headerName: "Created", field: "created_at", width: 160, valueFormatter: p => new Date(p.value).toLocaleString() },
			{ headerName: "Status",field: "status",minWidth: 140,
				cellRenderer: p => {
					const config = STATUS_CONFIG[p.value] || STATUS_CONFIG.open;
					return (
						<div className="flex items-center gap-2">
							<div 
								className="w-3 h-3 rounded-full" 
								style={{ backgroundColor: p.data.status_color || config.color }}
							/>
							<span 
								className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgClass}`}
								title={config.description}
							>
								{config.label}
							</span>
						</div>
					);
				}
			},
		];
		if(complaintPermissions.can_edit || complaintPermissions.can_delete || canAssignComplaints){
			cols.push({ headerName: "Actions", width: 150, pinned: "right",
				cellRenderer: p => (
					<div className="flex items-center gap-2 h-full">
						{complaintPermissions.can_edit && (
							<button onClick={() => handleEditClick(p.data)} className="p-1" title="Edit">
								<Edit size={16} style={{ color: theme.primaryGradientStart }}/>
							</button>
						)}
						{canAssignComplaints && (
							<button onClick={() => handleAssignClick(p.data)} className="p-1" title="Assign">
								<UserPlus size={16} style={{ color: theme.primaryGradientStart }}/>
							</button>
						)}
						{complaintPermissions.can_delete && (
							<button onClick={() => handleDeleteClick(p.data.id)} className="p-1 text-red-600 hover:text-red-800" title="Delete">
								<Trash2 size={16} />
							</button>
						)}
					</div>
				)
			});
		}
		return cols;
	}, [currentPage, perPage, complaintPermissions]);

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
		setBackendErrors(prev => ({ ...prev, [name]: undefined }))
	}

	const renderComplaintForm = () => {
		const shouldShowResolutionNotes = !editingComplaint?.isNew && 
			(formData.status === 'resolved' || formData.status === 'closed');
		return (
			<div className="space-y-4">
				<div className="grid md:grid-cols-4 gap-4">
					<ThemeUI.FormField label="Title" required error={backendErrors.title}>
						<ThemeUI.Input 
							name		= "title" 
							value		= {formData.title} 
							onChange	= {handleInputChange} 
							placeholder = "Enter title" 
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Category" required error={backendErrors.category_id}>
						<ThemeUI.Select
							value		   = {formData.category_id}
							onChange	   = {opt => {
								setFormData(prev => ({ ...prev, category_id: opt?.value || "", subcategory_id: "" }));
								setBackendErrors(prev => ({ ...prev, category_id: "", subcategory_id: "" }));
							}}
							options		   = {categories.map(c => ({ value: c.id, label: c.category }))}
							placeholder	   = "Select category"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Subcategory" error={backendErrors.subcategory_id}>
						<ThemeUI.Select
							value		   = {formData.subcategory_id}
							onChange       = {opt => {
								setFormData(prev => ({ ...prev, subcategory_id: opt?.value || "" }));
								setBackendErrors(prev => ({ ...prev, subcategory_id: "" }));
							}}
							options        = {subcategories
								.filter(s => s.category_id == formData.category_id)
								.map(s => ({ value: s.id, label: s.subcategory }))
							}
							placeholder    = "Select subcategory"
							isDisabled     = {!formData.category_id}
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="User Type" required error={backendErrors.user_type}>
						<ThemeUI.Select
							value		= {formData.user_type}
							onChange	= {opt => {
								setFormData(prev => ({ 
									...prev, 
									user_type: opt?.value || "", 
									user_id: "",
									ride_id: ""
								}));
								setSelectedUser(null);
								setSelectedRide(null);
								setBackendErrors(prev => ({ ...prev, user_type: "", user_id: "", ride_id: "" }));
							}}
							options={[
								{ value: "passenger", label: "Passenger" },
								{ value: "driver", label: "Driver" }
							]}
							placeholder  = "Select user type"
							isClearable
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="User" required error={backendErrors.user_id}>
						<ThemeUI.AutoComplete
							id			 = "user_autocomplete"
							name		 = "user_id"
							value		 = {selectedUser ? [selectedUser] : []}
							loadOptions  = {loadUsers}
							onChange     = {(selected) => {
								const selectedOption = selected?.[0] || null;
								setSelectedUser(selectedOption);
								setFormData(prev => ({ 
									...prev, 
									user_id: selectedOption?.value || "",
									ride_id: ""
								}));
								setSelectedRide(null);
								setBackendErrors(prev => ({ ...prev, user_id: undefined, ride_id: undefined }));
							}}
							placeholder    = "Type at least 2 characters to search user..."
							isMulti        = {false}
							isDisabled     = {!formData.user_type}
							minInputLength = {2}
							cacheOptions
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Ride" required error={backendErrors.ride_id}>
						<ThemeUI.AutoComplete
							id			   = "ride_autocomplete"
							name		   = "ride_id"
							value		   = {selectedRide ? [selectedRide] : []}
							loadOptions	   = {loadRides}
							onChange	   = {(selected) => {
								const selectedOption = selected?.[0] || null;
								setSelectedRide(selectedOption);
								setFormData(prev => ({ 
									...prev, 
									ride_id: selectedOption?.value || ""
								}));
								setBackendErrors(prev => ({ ...prev, ride_id: undefined }));
							}}
							placeholder	   = "Search rides or leave empty to see recent..."
							isMulti		   = {false}
							isDisabled	   = {!formData.user_id}
							minInputLength = {0}
							cacheOptions
							noOptionsMessage = {() => formData.user_id ? "No rides found" : "Select user first"}
						/>
					</ThemeUI.FormField>
					{!editingComplaint?.isNew && (
						<ThemeUI.FormField label="Status" error={backendErrors.status}>
							<ThemeUI.Select
								value={formData.status}
								onChange={opt => setFormData(prev => ({ ...prev, status: opt.value }))}
								options={[
									{ 
										value: "open", 
										label: (
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG.open.color }} />
												<span>Open</span>
											</div>
										)
									},
									{ 
										value: "resolved", 
										label: (
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG.resolved.color }} />
												<span>Resolved</span>
											</div>
										)
									},
									{ 
										value: "escalate", 
										label: (
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG.escalate.color }} />
												<span>Escalate</span>
											</div>
										)
									},
									{ 
										value: "closed", 
										label: (
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG.closed.color }} />
												<span>Closed</span>
											</div>
										)
									},
									{ 
										value: "reopen", 
										label: (
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_CONFIG.reopen.color }} />
												<span>Reopen</span>
											</div>
										)
									}
								]}
								formatOptionLabel={(option) => option.label}
							/>
							{formData.status && (
								<p className="text-xs text-gray-500 mt-1">
									{STATUS_CONFIG[formData.status]?.description}
								</p>
							)}
						</ThemeUI.FormField>
					)}
				</div>
				
				{/* Custom Query and Resolution Notes Section */}
				{(isOthersCategory || shouldShowResolutionNotes) && (
					<div className={`grid ${isOthersCategory && shouldShowResolutionNotes ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
						{isOthersCategory && (
							<ThemeUI.FormField label="Custom Query" required error={backendErrors.custom_query}>
								<ThemeUI.Textarea
									name        = "custom_query"
									value       = {formData.custom_query}
									onChange    = {handleInputChange}
									rows        = {3}
									placeholder = "Please describe your specific query or issue..."
								/>
								<p className="text-xs text-gray-500 mt-1">
									Since you selected "Others" category, please provide details about your specific query
								</p>
							</ThemeUI.FormField>
						)}
						{shouldShowResolutionNotes && (
							<ThemeUI.FormField 
								label="Resolution Notes" 
								required={formData.status === 'resolved' || formData.status === 'closed'}
								error={backendErrors.resolution_notes}
							>
								<ThemeUI.Textarea
									name		= "resolution_notes"
									value		= {formData.resolution_notes}
									onChange	= {handleInputChange}
									rows		= {4}
									placeholder	= "Add resolution notes (required for resolved/closed)"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Required when marking as resolved or closed
								</p>
							</ThemeUI.FormField>
						)}
					</div>
				)}
				
				{/* Description and Attachments Row */}
				<div className="grid md:grid-cols-2 gap-4">
					<ThemeUI.FormField 
						label="Attachments (Optional)" 
						error={backendErrors.attachments}
					>
						<ThemeUI.MultiFileInput
							id="complaint_attachments"
							name="attachments"
							onChange={handleAttachmentChange}
							accept="image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
							files={attachmentFiles}
							onDeleteFile={handleAttachmentDelete}
							maxFiles={5}
							maxSize={5}
							placeholder="Drag files here or click to browse (Images, PDF, DOC)"
							error={backendErrors.attachments}
						/>
						{attachmentFiles.length > 0 && (
							<p className="text-xs text-gray-500 mt-1">
								{attachmentFiles.length} of 5 files selected
							</p>
						)}
						<p className="text-xs text-gray-500 mt-1">
							Accepted formats: Images (PNG, JPG, JPEG), PDF, DOC, DOCX. Max 5MB per file.
						</p>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Description" error={backendErrors.description}>
						<ThemeUI.Textarea
							name		    = "description"
							value			= {formData.description}
							onChange		= {handleInputChange}
							rows			= {5}
							placeholder		= "Describe the complaint in detail..."
						/>
					</ThemeUI.FormField>
				</div>
				
				<div className="flex justify-end gap-3 pt-4">
					<ThemeUI.Button 
						onClick			= {handleCancel} 
						gradientColors  = {{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
					>
						Cancel
					</ThemeUI.Button>
					<ThemeUI.Button 
						onClick			= {handleSaveComplaint} 
						disabled		= {isSubmitting} 
						gradientColors	= {{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
					>
						{isSubmitting ? (
							<> <Loader className="animate-spin mr-2" size={16} /> Saving... </>
						) : (
							editingComplaint?.isNew ? "Create Complaint" : "Update Complaint"
						)}
					</ThemeUI.Button>
				</div>
			</div>
		);
	}

	const renderAssignmentForm = () => (
		<div className="space-y-6">
			<div className="rounded-lg p-3 flex items-start gap-2" style={{
				background: `linear-gradient(135deg, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`
			}}>
				<Info size={16} className="mt-0.5 text-white" />
				<div className="text-xs text-white">
					<p className="font-medium mb-1">Assignment Visibility Rules:</p>
					<ul className="list-disc list-inside space-y-1">
						<li>Unassigned complaints are visible to <strong>all team members</strong></li>
						<li>Once assigned, only <strong>assigned members</strong> can see it</li>
						<li>First assigned member becomes the <strong>owner</strong></li>
						{assigningComplaint?.owner && (<li>Current Owner:  <strong>{assigningComplaint.owner.name}</strong></li>)}
						{assigningComplaint?.assignments?.filter(a => a.is_active).length > 0 && (<li>Currently Assigned:  <strong>{assigningComplaint.assignments.filter(a => a.is_active).map(a => a.assignedUser?.name).join(', ')}</strong></li>)}
					</ul>
				</div>
			</div>
			<ThemeUI.FormField label="Assign To" required>
				<ThemeUI.AutoComplete
					id				= "team_members_autocomplete"
					name			= "assigned_to"
					value			= {selectedTeamMembers}
					loadOptions		= {loadTeamMembers}
					onChange		= {(selected) => {
						setSelectedTeamMembers(selected || []);
					}}
					placeholder		= "Type at least 2 characters to search team members..."
					isMulti			= {true}
					minInputLength	= {2}
					cacheOptions
				/>
				<p className="text-xs text-gray-500 mt-1">
					You can assign multiple team members to this complaint
				</p>
			</ThemeUI.FormField>
			<ThemeUI.FormField label="Assignment Notes">
				<ThemeUI.Textarea
					name			= "assignment_notes"
					value			= {assignmentNotes}
					onChange		= {(e) => setAssignmentNotes(e.target.value)}
					rows			= {4}
					placeholder		= "Add any notes about this assignment (optional)..."
				/>
			</ThemeUI.FormField>
			<div className="flex justify-end gap-3 pt-4">
				<ThemeUI.Button 
					onClick			= {() => setIsAssignModalOpen(false)} 
					gradientColors	= {{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
				>
					Cancel
				</ThemeUI.Button>
				<ThemeUI.Button 
					onClick			= {handleSaveAssignment} 
					disabled	    = {isSubmitting || selectedTeamMembers.length === 0} 
					gradientColors  = {{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
				>
					{isSubmitting ? (
						<> <Loader className="animate-spin mr-2" size={16} /> Assigning... </>
					) : ("Assign Members")}
				</ThemeUI.Button>
			</div>
		</div>
	);

	const renderViewAssignments = () => {
		if(!viewingAssignments) return null;
		const activeAssignments = viewingAssignments.assignments?.filter(a => a.is_active) || [];
		return(
			<div className="space-y-4">
				{activeAssignments.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<UserMinus size={48} className="mx-auto mb-3 text-gray-300" />
						<p className="text-sm">No active assignments</p>
						<p className="text-xs mt-1">This complaint is visible to all team members</p>
					</div>
				) : (
					<>
						<div className="rounded-lg p-2 flex items-start gap-2" style={{
							background: `linear-gradient(135deg, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`
						}}>
							<Shield size={16} className="mt-0.5 text-white" />
							<p className="text-xs text-white">
								This complaint is <strong>only visible</strong> to the assigned members below 
							</p>
						</div>
						<div className="space-y-3">
							{activeAssignments.map((assignment) => (
								<div 
									key={assignment.id} 
									className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-2">
												<User size={16} className="text-gray-600" />
												<h4 className="font-semibold text-gray-900">
													{assignment.assignedUser?.name || 'Unknown'}
												</h4>
												{viewingAssignments.owner_id === assignment.assigned_to && (
													<span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
														Owner
													</span>
												)}
											</div>
											<p className="text-sm text-gray-600 mb-2">
												{assignment.assignedUser?.email}
											</p>
											{assignment.notes && (
												<div className="bg-gray-50 rounded p-2 text-xs text-gray-700 mb-2">
													<strong>Notes:</strong> {assignment.notes}
												</div>
											)}
											<p className="text-xs text-gray-500">
												Assigned on: {new Date(assignment.assigned_at).toLocaleString()}
											</p>
										</div>
										<button
											onClick={() => handleUnassign(viewingAssignments.id, [assignment.id])}
											className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
											title="Remove assignment"
										>
											<UserMinus size={18} />
										</button>
									</div>
								</div>
							))}
						</div>
					</>
				)}
				<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
					{activeAssignments.length > 1 && (
						<ThemeUI.Button
							onClick={() => handleUnassign(
								viewingAssignments.id, 
								activeAssignments.map(a => a.id)
							)}
							gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
							className="w-full"
						>
							<UserMinus size={16} className="mr-2" />
							Remove All Assignments
						</ThemeUI.Button>
					)}
					<ThemeUI.Button 
						onClick={() => setIsViewAssignmentsModalOpen(false)} 
						gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
					>
						Close
					</ThemeUI.Button>
				</div>
			</div>
		);
	};

	return(
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
					Complaints Management
				</h1>
				<nav className="flex items-center text-sm text-gray-500">
					<ol className="flex items-center">
						<li><a href="/dashboard" className="hover:text-blue-600">Home</a></li>
						<li><ChevronRight className="h-4 w-4 mx-1" /></li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">Complaints</li>
					</ol>
				</nav>
			</div>
			<div className="mb-4">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
					<div className="w-full sm:w-1/3">
						<ThemeUI.Input
							value={searchQuery}
							onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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
						{complaintPermissions.can_add && (
							<ThemeUI.Button onClick={handleAddClick} gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}>
								<Plus size={16} className="mr-2" /> Add Complaint
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
					defaultColDef={{ resizable: true, sortable: true }}
					columnDefs={columnDefs}
					rowData={complaints}
					rowHeight={58}
					pagination
					paginationPageSize={perPage}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					onPaginationChanged={e => e.api && setCurrentPage(e.api.paginationGetCurrentPage() + 1)}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Complaints Found" }}
					loading={isLoading}
				/>
			</div>
			<Modal 
				isOpen	= {isModalOpen} 
				onClose	= {handleCancel} 
				title	= {editingComplaint?.isNew ? "Create New Complaint" : "Edit Complaint"} 
				size	= "full"
			>
				{renderComplaintForm()}
			</Modal>
			<Modal 
				isOpen	= {isAssignModalOpen} 
				onClose	= {() => setIsAssignModalOpen(false)} 
				title	= "Assign Complaint to Team Members" 
				size	= "lg"
			>
				{renderAssignmentForm()}
			</Modal>
			<Modal
				isOpen	= {isViewAssignmentsModalOpen}
				onClose	= {() => setIsViewAssignmentsModalOpen(false)}
				title	= "View & Manage Assignments"
				size	= "lg"
			>
				{renderViewAssignments()}
			</Modal>
			<Offcanvas 
				isOpen  = {isFilterOffcanvasOpen} 
				onClose = {() => setIsFilterOffcanvasOpen(false)} 
				title   = "Filter Complaints" 
				position= "right"
			>
				<div className="space-y-4">
					<ThemeUI.FormField label="Ticket Number">
						<ThemeUI.Input
							value={ticketNoFilter}
							onChange={e => { setTicketNoFilter(e.target.value); setCurrentPage(1) }}
							placeholder="e.g., TKT-00000001"
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="User Type">
						<ThemeUI.Select
							value={userTypeFilter ? { value: userTypeFilter, label: userTypeFilter.toUpperCase() } : null}
							onChange={opt => { setUserTypeFilter(opt?.value || ""); setCurrentPage(1) }}
							options={[
								{ value: "passenger", label: "Passenger" },
								{ value: "driver", label: "Driver" }
							]}
							isClearable
							placeholder="All user types"
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Status">
						<ThemeUI.Select
							value={statusFilter ? statusFilter : null}
							onChange={opt => { setStatusFilter(opt?.value || ""); setCurrentPage(1); }}
							options={[
								{ value: "open", label: "Open" },
								{ value: "resolved", label: "Resolved" },
								{ value: "escalate", label: "Escalated" },
								{ value: "closed", label: "Closed" },
								{ value: "reopen", label: "Reopened" }
							]}
							isClearable
							placeholder="All statuses"
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Category">
						<ThemeUI.Select
							value={categoryFilter ? categoryFilter : null}
							onChange={opt => { setCategoryFilter(opt?.value || ""); setSubcategoryFilter(""); setCurrentPage(1) }}
							options={categories.map(c => ({ value: c.id, label: c.category }))}
							isClearable
							placeholder="All categories"
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Subcategory">
						<ThemeUI.Select
							value={subcategoryFilter ? subcategoryFilter : null}
							onChange={opt => { setSubcategoryFilter(opt?.value || ""); setCurrentPage(1) }}
							options={subcategories
								.filter(s => !categoryFilter || s.category_id == categoryFilter)
								.map(s => ({ value: s.id, label: s.subcategory }))
							}
							isDisabled={!categoryFilter}
							isClearable
							placeholder="All subcategories"
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="State (Pickup or Dropoff)">
						<ThemeUI.Select
							value={stateFilter ? states.find(s => s.id == stateFilter) : null}
							onChange={opt => { 
								setStateFilter(opt?.value || "")
								setPickupStateFilter("")
								setDropoffStateFilter("")
								setCurrentPage(1)
							}}
							options={states.map(s => ({ 
								value: s.id, 
								label: s.state_name 
							}))}
							isClearable
							placeholder="Filter by any state"
						/>
						<p className="text-xs text-gray-500 mt-1">
							Shows complaints where pickup OR dropoff is in this state
						</p>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Pickup State">
						<ThemeUI.Select
							value={pickupStateFilter ? states.find(s => s.id == pickupStateFilter) : null}
							onChange={opt => { 
								setPickupStateFilter(opt?.value || "")
								setStateFilter("")
								setCurrentPage(1)
							}}
							options={states.map(s => ({ 
								value: s.id, 
								label: s.state_name 
							}))}
							isClearable
							placeholder="Filter by pickup state"
							isDisabled={!!stateFilter}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField label="Dropoff State">
						<ThemeUI.Select
							value={dropoffStateFilter ? states.find(s => s.id == dropoffStateFilter) : null}
							onChange={opt => { 
								setDropoffStateFilter(opt?.value || "")
								setStateFilter("")
								setCurrentPage(1)
							}}
							options={states.map(s => ({ 
								value: s.id, 
								label: s.state_name 
							}))}
							isClearable
							placeholder="Filter by dropoff state"
							isDisabled={!!stateFilter}
						/>
					</ThemeUI.FormField>
					<ThemeUI.Button
						onClick={() => { 
							setSearchQuery("")
							setTicketNoFilter("")
							setStatusFilter("")
							setCategoryFilter("")
							setSubcategoryFilter("")
							setUserTypeFilter("")
							setOwnerFilter("")
							setStateFilter("")           
							setPickupStateFilter("")     
							setDropoffStateFilter("")    
							setCurrentPage(1)
						}}
						gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
					>
						Reset Filters
					</ThemeUI.Button>
				</div>
			</Offcanvas>
		</Layout>
	)
}
export default Complaints