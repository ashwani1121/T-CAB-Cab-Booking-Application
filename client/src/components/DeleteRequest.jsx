import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Check, XCircle, Info, IndianRupee, AlertTriangle } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])

function DeleteRequest(){
	const { theme } = useTheme()
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [deleteRequests, setDeleteRequests] = useState([])
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
	const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
	const [selectedDriver, setSelectedDriver] = useState(null)
	const [selectedDriverForApprove, setSelectedDriverForApprove] = useState(null)
	const [financialSummary, setFinancialSummary] = useState(null)
	const [loadingFinancials, setLoadingFinancials] = useState(false)
	const [rejectionReason, setRejectionReason] = useState("")
	const [backendErrors, setBackendErrors] = useState({})
	const [placeholder, setPlaceholder] = useState("Search by name...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["name", "email", "mobile", "reason"]

	const [deleteRequestPermissions, setDeleteRequestPermissions] = useState({
		can_view: false
	})

	const getUserPermissions = useCallback(() => {
		try{
			const permissionsStr = localStorage.getItem('userPermissions')
			if(permissionsStr){
				const permissions = JSON.parse(permissionsStr)
				if(permissions['delete_request']){
					return {
						can_view: permissions['delete_request'].can_view || false
					}
				}
			}
			return{ can_view: false }
		}catch(error){
			console.error('Error parsing user permissions:', error)
			return { can_view: false }
		}
	}, [])
		
	useEffect(() => {
		const permissions = getUserPermissions()
		setDeleteRequestPermissions(permissions)
	}, [getUserPermissions])

	useEffect(() => {
		const handlePermissionsUpdate = () => {
			const permissions = getUserPermissions()
			setDeleteRequestPermissions(permissions)
		}
		window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
		return () => {
			window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
		}
	}, [getUserPermissions])

	useEffect(() => {
		fetchDeleteRequests()
	}, [currentPage, perPage, searchQuery, statusFilter])

	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if(!isDeleting && currentCharIndex < currentWord.length){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			}else if(isDeleting && currentCharIndex > 0){
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			}else if(!isDeleting && currentCharIndex === currentWord.length){
				setTimeout(() => setIsDeleting(true), pauseTime)
			}else if(isDeleting && currentCharIndex === 0){
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	const fetchDeleteRequests = useCallback(async () => {
		setIsLoading(true)
		try{
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/drivers/delete/request`,{
					params: {
						page: currentPage,
						limit: perPage,
						search: searchQuery,
						status: statusFilter === "all" ? "" : statusFilter,
					},
				}
			)
			if(response.data.success){
				setDeleteRequests(response.data.data.drivers || [])
				setTotalRows(response.data.data.pagination.total_records || 0)
			}else{
				toast.error("Failed to fetch delete requests")
				setDeleteRequests([])
				setTotalRows(0)
			}
		}catch(err){
			console.error("Error fetching delete requests:", err)
			toast.error(err.response?.data?.message || "Failed to fetch delete requests")
			setDeleteRequests([])
			setTotalRows(0)
		}finally{
			setIsLoading(false)
		}
	}, [currentPage, perPage, searchQuery, statusFilter])

	const fetchFinancialSummary = async (driverId) => {
		setLoadingFinancials(true)
		try{
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/drivers/delete/request/${driverId}/financial-summary`
			)
			if(response.data.success){
				setFinancialSummary(response.data.data)
			}else{
				toast.error("Failed to fetch financial summary")
			}
		}catch(err){
			console.error("Error fetching financial summary:", err)
			toast.error(err.response?.data?.message || "Failed to fetch financial summary")
		}finally{
			setLoadingFinancials(false)
		}
	}

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value)
		setCurrentPage(1)
	}

	const handlePageChange = (page) => {
		setCurrentPage(page)
	}

	const handlePerRowsChange = (newPerPage, page) => {
		setPerPage(newPerPage)
		setCurrentPage(page)
	}

	const handleApproveClick = async (driver) => {
		setSelectedDriverForApprove(driver)
		setFinancialSummary(null)
		setIsApproveModalOpen(true)
		await fetchFinancialSummary(driver.id)
	}

	const handleConfirmApprove = async () => {
		if (!selectedDriverForApprove) return
		setIsLoading(true)
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_URL}/admin/drivers/delete/request/${selectedDriverForApprove.id}`,
				{ action: "approve" }
			)
			if (response.data.success) {
				toast.success(response.data.message || "Request approved successfully")
				setIsApproveModalOpen(false)
				setSelectedDriverForApprove(null)
				setFinancialSummary(null)
				fetchDeleteRequests()
			} else {
				toast.error(response.data.message || "Failed to approve request")
			}
		} catch (err) {
			console.error("Approval error:", err)
			toast.error(err.response?.data?.message || "Approval failed")
		} finally {
			setIsLoading(false)
		}
	}

	const handleApproveModalClose = () => {
		setIsApproveModalOpen(false)
		setSelectedDriverForApprove(null)
		setFinancialSummary(null)
	}

	const handleRejectClick = (driver) => {
		setSelectedDriver(driver)
		setRejectionReason("")
		setBackendErrors({})
		setIsRejectModalOpen(true)
	}

	const handleRejectionReasonChange = (e) => {
		const { value } = e.target
		setRejectionReason(value)
		setBackendErrors((prev) => ({ ...prev, rejection_reason: "" }))
	}

	const handleRejectSubmit = async (e) => {
		e.preventDefault()
		if (!rejectionReason.trim()) {
			setBackendErrors({ rejection_reason: "Rejection reason is required" })
			return
		}
		setIsLoading(true)
		setBackendErrors({})
		try {
			const response = await axios.put(
				`${import.meta.env.VITE_API_URL}/admin/drivers/delete/request/${selectedDriver.id}`,
				{ action: "reject", rejection_reason: rejectionReason }
			)
			if (response.data.success) {
				toast.success(response.data.message || "Request rejected successfully")
				setIsRejectModalOpen(false)
				setSelectedDriver(null)
				setRejectionReason("")
				fetchDeleteRequests()
			} else {
				toast.error(response.data.message || "Failed to reject request")
				if(response.data.errors){
					setBackendErrors(response.data.errors)
				}
			}
		} catch (err) {
			console.error("Rejection error:", err)
			const errorMessage = err.response?.data?.message || "Rejection failed"
			toast.error(errorMessage)
			if(err.response?.data?.errors){
				setBackendErrors(err.response.data.errors)
			}
		} finally {
			setIsLoading(false)
		}
	}

	const handleRejectModalClose = () => {
		setIsRejectModalOpen(false)
		setSelectedDriver(null)
		setRejectionReason("")
		setBackendErrors({})
	}

	const renderFinancialSummary = () => {
		if(loadingFinancials){
			return (
				<div className="flex items-center justify-center p-8">
					<Loader size={32} className="animate-spin" style={{ color: theme.primaryGradientStart }} />
					<span className="ml-3 text-gray-600">Loading financial data...</span>
				</div>
			)
		}

		if(!financialSummary){
			return null
		}

		const { driver_owes, admin_owes, settlement, statistics, warnings } = financialSummary

		return (
			<div className="space-y-6">
				{/* Warnings Section */}
				{(warnings.has_pending_rides || warnings.has_outstanding_cash || warnings.has_pending_payout || warnings.wallet_balance_includes_deductions) && (
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div className="flex items-start">
							<AlertTriangle size={20} className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<h4 className="font-semibold text-yellow-800 mb-2">Warnings</h4>
								<ul className="text-sm text-yellow-700 space-y-1">
									{warnings.has_pending_rides && <li>• Driver has active/pending rides</li>}
									{warnings.has_outstanding_cash && <li>• Driver has outstanding cash commission</li>}
									{warnings.has_pending_payout && <li>• Admin has pending payout to driver</li>}
									{warnings.deposit_not_refunded && <li>• Deposit needs to be refunded</li>}
									{warnings.wallet_balance_includes_deductions && (
										<li>• Wallet balance shown is after cancellation charge deductions</li>
									)}
								</ul>
							</div>
						</div>
					</div>
				)}

				{/* Net Settlement */}
				<div className={`rounded-lg p-4 ${settlement.settlement_type === 'admin_pays_driver' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Net Settlement</p>
							<p className={`text-2xl font-bold ${settlement.settlement_type === 'admin_pays_driver' ? 'text-green-700' : 'text-red-700'}`}>
								₹{settlement.net_amount.toFixed(2)}
							</p>
							<p className="text-sm text-gray-600 mt-1">{settlement.description}</p>
							{settlement.breakdown && (
								<div className="mt-2 text-xs text-gray-500">
									<p>Admin Owes: ₹{settlement.breakdown.admin_owes.toFixed(2)}</p>
									<p>Driver Owes: ₹{settlement.breakdown.driver_owes.toFixed(2)}</p>
									{settlement.breakdown.cancellation_charges_already_deducted > 0 && (
										<p className="text-orange-600 font-medium">
											(Cancellation charges ₹{settlement.breakdown.cancellation_charges_already_deducted.toFixed(2)} already deducted)
										</p>
									)}
								</div>
							)}
						</div>
						<IndianRupee size={40} className={settlement.settlement_type === 'admin_pays_driver' ? 'text-green-600' : 'text-red-600'} />
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Driver Owes to Admin */}
					<div className="border border-gray-200 rounded-lg p-4">
						<h4 className="font-semibold text-gray-800 mb-4 flex items-center">
							<span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
							Driver Owes to Admin
						</h4>
						<div className="space-y-3">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-sm text-gray-600">Cash Commission</p>
									<p className="text-xs text-gray-500">{driver_owes.cash_commission.ride_count} rides</p>
								</div>
								<p className="font-semibold text-red-600">₹{driver_owes.cash_commission.amount.toFixed(2)}</p>
							</div>
							<div className="flex justify-between items-start">
								<div>
									<p className="text-sm text-gray-600">Cancellation Charges</p>
									<p className="text-xs text-gray-500">{driver_owes.cancellation_charges.charge_count} penalties</p>
									<p className="text-xs text-orange-600 font-medium mt-1">
										{driver_owes.cancellation_charges.note}
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold text-orange-600 line-through">₹{driver_owes.cancellation_charges.amount.toFixed(2)}</p>
									<p className="text-xs text-gray-500">Already deducted</p>
								</div>
							</div>
							<div className="pt-3 border-t border-gray-200">
								<div className="flex justify-between items-center">
									<p className="font-semibold text-gray-700">Total</p>
									<p className="font-bold text-red-600 text-lg">₹{driver_owes.total.toFixed(2)}</p>
								</div>
								<p className="text-xs text-gray-500 mt-1 text-right">
									(Excluding already deducted charges)
								</p>
							</div>
						</div>
					</div>

					{/* Admin Owes to Driver */}
					<div className="border border-gray-200 rounded-lg p-4">
						<h4 className="font-semibold text-gray-800 mb-4 flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
							Admin Owes to Driver
						</h4>
						<div className="space-y-3">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-sm text-gray-600">Online Payout</p>
									<p className="text-xs text-gray-500">{admin_owes.online_payout.ride_count} rides</p>
								</div>
								<p className="font-semibold text-green-600">₹{admin_owes.online_payout.amount.toFixed(2)}</p>
							</div>
							<div className="flex justify-between items-start">
								<div>
									<p className="text-sm text-gray-600">Wallet Balance</p>
									<p className="text-xs text-gray-500">{admin_owes.wallet_balance.note}</p>
								</div>
								<p className="font-semibold text-green-600">₹{admin_owes.wallet_balance.amount.toFixed(2)}</p>
							</div>
							{admin_owes.deposit_refund.amount > 0 && (
								<div className="flex justify-between items-start">
									<div>
										<p className="text-sm text-gray-600">Deposit Refund</p>
										<p className="text-xs text-gray-500">Status: {admin_owes.deposit_refund.status}</p>
									</div>
									<p className="font-semibold text-green-600">₹{admin_owes.deposit_refund.amount.toFixed(2)}</p>
								</div>
							)}
							<div className="pt-3 border-t border-gray-200">
								<div className="flex justify-between items-center">
									<p className="font-semibold text-gray-700">Total</p>
									<p className="font-bold text-green-600 text-lg">₹{admin_owes.total.toFixed(2)}</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Statistics */}
				<div className="border border-gray-200 rounded-lg p-4">
					<h4 className="font-semibold text-gray-800 mb-4">Ride Statistics</h4>
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						<div>
							<p className="text-xs text-gray-500">Total Rides</p>
							<p className="text-lg font-semibold text-gray-800">{statistics.total_completed_rides}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Pending Rides</p>
							<p className="text-lg font-semibold text-gray-800">{statistics.pending_active_rides}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Total Earnings</p>
							<p className="text-lg font-semibold text-gray-800">₹{statistics.total_earnings.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Total Tips</p>
							<p className="text-lg font-semibold text-gray-800">₹{statistics.total_tips.toFixed(2)}</p>
						</div>
						<div>
							<p className="text-xs text-gray-500">Cancellation Charges</p>
							<p className="text-lg font-semibold text-orange-600">₹{statistics.total_cancellation_charges.toFixed(2)}</p>
							<p className="text-xs text-gray-500">{statistics.cancellation_count} times</p>
						</div>
					</div>
				</div>
			</div>
		)
	}

	const renderApproveConfirmation = () => (
		<div className="p-4">
			<div className="mb-4">
				<p className="text-lg mb-2">
					Are you sure you want to approve the deletion request for <strong>{selectedDriverForApprove?.name}</strong>?
				</p>
				<p className="text-sm text-gray-600">
					Please review the financial summary below before approving.
				</p>
			</div>
			
			{renderFinancialSummary()}

			<div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
				<ThemeUI.Button
					type="button"
					onClick={handleApproveModalClose}
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
					type="button"
					onClick={handleConfirmApprove}
					disabled={isLoading || loadingFinancials}
					gradientColors={{
						start: theme.primaryGradientStart,
						end: theme.primaryGradientEnd,
					}}
					direction={theme.gradientDirection}
				>
					{isLoading && <Loader size={16} className="mr-2 animate-spin" />}
					Approve Request
				</ThemeUI.Button>
			</div>
		</div>
	)

	const renderRejectForm = () => (
		<form onSubmit={handleRejectSubmit} className="space-y-6 p-4">
			<ThemeUI.FormField
				label="Rejection Reason"
				name="rejection_reason"
				error={backendErrors.rejection_reason}
				required
			>
				<ThemeUI.Textarea
					id="rejection_reason"
					name="rejection_reason"
					rows="4"
					value={rejectionReason}
					onChange={handleRejectionReasonChange}
					placeholder="Enter rejection reason..."
					error={backendErrors.rejection_reason}
				/>
			</ThemeUI.FormField>

			<div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
				<ThemeUI.Button
					type="button"
					onClick={handleRejectModalClose}
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
					Reject Request
				</ThemeUI.Button>
			</div>
		</form>
	)

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
				minWidth   : 150,
				flex	   : 1,
			},
			{
				headerName : "Email",
				field	   : "email",
				sortable   : true,
				minWidth   : 200,
				flex       : 1.5,
			},
			{
				headerName : "Mobile",
				field	   : "mobile",
				sortable   : true,
				minWidth   : 150,
				flex       : 1,
			},
			{
				headerName: "Request Status",
				field: "deletion_request",
				cellRenderer: (params) => {
					const status = params.value === 1 ? "Requested" : "Approved"
					const color = params.value === 1 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
					return (
						<span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
							{status}
						</span>
					)
				},
				minWidth: 150,
				flex: 1,
				sortable: true,
			},
			{
				headerName : "Requested On",
				field	   : "deletion_requested_at",
				flex	   : 1.2,
				minWidth   : 180,
				sortable   : true,
				valueFormatter: (params) => (params.value ? new Date(params.value).toLocaleString() : "-"),
			},
			{
				headerName : "Reason",
				field	   : "deletion_reason",
				flex	   : 1.5,
				minWidth   : 220,
				sortable   : true,
			},
		]
		
		baseColumns.push({
			headerName  : "Actions",
			field       : "actions",
			cellRenderer: (params) => (
				<div className="flex items-center gap-2">
					{params.data.deletion_request === 1 && (
						<>
							<button
								onClick   = {() => handleApproveClick(params.data)}
								className = "p-1 text-green-600 hover:text-green-800 transition-colors"
								title     = "Approve Request"
							>
								<Check size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
							<button
								onClick   = {() => handleRejectClick(params.data)}
								className = "p-1 text-red-600 hover:text-red-800 transition-colors"
								title     = "Reject Request"
							>
								<XCircle size={16} style={{ color: theme.primaryGradientStart }} />
							</button>
						</>
					)}
					{params.data.deletion_request === 2 && (
						<button
							className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
							title="Request Approved"
						>
							<Info size={16} />
						</button>
					)}
				</div>
			),
			minWidth    : 120,
			flex        : 0.5,
			sortable    : false,
		})
		
		return baseColumns
	}, [theme.primaryGradientStart, currentPage, perPage])

	return(
		<Layout>
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">Driver Delete Requests</h1>
				<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
					<ol className="flex items-center">
						<li>
							<a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
						</li>
						<li className="flex items-center">
							<ChevronRight className="h-4 w-4 mx-1" />
						</li>
						<li style={{ color: theme.primaryGradientStart }} className="font-medium">
							Delete Requests
						</li>
					</ol>
				</nav>
			</div>

			<div className="mb-4 rounded-lg w-full">
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
							<Filter size={16} className="sm:mr-2" />
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
					rowData={deleteRequests}
					rowHeight={55}
					columnDefs={columnDefs}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					paginationNumberFormatter={(params) => `${params.value}`}
					suppressCellFocus
					suppressPaginationPanel={false}
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Deletion Requests Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
							const newPage = params.api.paginationGetCurrentPage() + 1
							handlePageChange(newPage)
						}
					}}
				/>
			</div>

			{/* Approve Modal with Financial Summary */}
			<Modal
				isOpen={isApproveModalOpen}
				onClose={handleApproveModalClose}
				title="Approve Deletion Request - Financial Summary"
				size="xl"
			>
				{renderApproveConfirmation()}
			</Modal>

			{/* Reject Modal */}
			<Modal
				isOpen={isRejectModalOpen}
				onClose={handleRejectModalClose}
				title="Reject Deletion Request"
				size="md"
			>
				{renderRejectForm()}
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
								{ value: "1", label: "Requested" },
								{ value: "2", label: "Approved" },
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
		</Layout>
	)
}

export default DeleteRequest