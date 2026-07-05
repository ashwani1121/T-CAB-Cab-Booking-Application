import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Download, Eye } from "lucide-react"
import Offcanvas from "./Offcanvas"
import Modal from "./Modal"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'
function AdvanceReservation() {
	const { theme } = useTheme()
	const gridRef = useRef(null)
	const [isLoading, setIsLoading] = useState(false)
	const [totalRows, setTotalRows] = useState(0)
	const [perPage, setPerPage] = useState(10)
	const [currentPage, setCurrentPage] = useState(1)
	const [transactions, setTransactions] = useState([])
	const [searchQuery, setSearchQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState("")
	const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
	const [isViewModalOpen, setIsViewModalOpen] = useState(false)
	const [selectedTransaction, setSelectedTransaction] = useState(null)
	const [isLoadingDetails, setIsLoadingDetails] = useState(false)
	const [placeholder, setPlaceholder] = useState("Search by transaction...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["transaction_id", "user_name", "status"]

	// Fetch transactions on mount and when pagination/search/filter changes
	useEffect(() => {
		fetchTransactions(
			currentPage,
			perPage,
			searchQuery,
			statusFilter
		)
	}, [currentPage, perPage, searchQuery, statusFilter])

	// Typing animation for placeholder
	useEffect(() => {
		const typingSpeed = isDeleting ? 50 : 100
		const pauseTime = 1500
		const timeout = setTimeout(() => {
			const currentWord = words[currentWordIndex]
			if (!isDeleting && currentCharIndex < currentWord.length) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
				setCurrentCharIndex((prev) => prev + 1)
			} else if (isDeleting && currentCharIndex > 0) {
				setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
				setCurrentCharIndex((prev) => prev - 1)
			} else if (!isDeleting && currentCharIndex === currentWord.length) {
				setTimeout(() => setIsDeleting(true), pauseTime)
			} else if (isDeleting && currentCharIndex === 0) {
				setIsDeleting(false)
				setCurrentWordIndex((prev) => (prev + 1) % words.length)
			}
		}, typingSpeed)
		return () => clearTimeout(timeout)
	}, [currentCharIndex, currentWordIndex, isDeleting, words])

	// Fetch transactions
	const fetchTransactions = useCallback(async (page, limit, search, status) => {
		setIsLoading(true)
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/transactions/reservation-advance`, {
					params: {
						page,
						limit,
						search,
						status: status === "all" ? "" : status,
					},
				}
			)
			if (response.data.success) {
				setTransactions(response.data.data.payments || [])
				setTotalRows(response.data.data.pagination?.total_records || 0)
			}
		} catch (err) {
			console.error("Error fetching advance reservations:", err)
			toast.error(err.response?.data?.message || "Failed to fetch advance reservations")
			setTransactions([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// Fetch transaction details
	const fetchTransactionDetails = useCallback(async (id) => {
		setIsLoadingDetails(true)
		try {
			const response = await axios.get(
				`${import.meta.env.VITE_API_URL}/admin/transactions/reservation-advance/${id}`
			)
			if (response.data.success) {
				setSelectedTransaction(response.data.data)
			}
		} catch (err) {
			console.error("Error fetching transaction details:", err)
			toast.error(err.response?.data?.message || "Failed to fetch transaction details")
		} finally {
			setIsLoadingDetails(false)
		}
	}, [])

	// Handle view transaction
	const handleViewTransaction = useCallback((transaction) => {
		setIsViewModalOpen(true)
		fetchTransactionDetails(transaction.id)
	}, [fetchTransactionDetails])

	// Handle close view modal
	const handleViewModalClose = useCallback(() => {
		setIsViewModalOpen(false)
		setSelectedTransaction(null)
	}, [])

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try {
			const exportData = transactions.map((transaction, index) => ({
				'S.No': (currentPage - 1) * perPage + index + 1,
				'Transaction ID': transaction.transaction_id,
				'User Name': transaction.user?.name || '',
				'Advance Amount': `₹${transaction.advance_amount}`,
				'Remaining Amount': `₹${transaction.remaining_amount}`,
				'Estimated Total Fare': `₹${transaction.estimated_total_fare}`,
				'Pickup Date': new Date(transaction.pickup_date).toLocaleDateString(),
				'Pickup Time': transaction.pickup_time,
				'Payment Status': transaction.payment_status,
				'Status': transaction.status,
				'Created At': new Date(transaction.created_at).toLocaleString(),
				'Updated At': new Date(transaction.updated_at).toLocaleString()
			}))
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [
				{ wch: 8 },   // S.No
				{ wch: 20 },  // Transaction ID
				{ wch: 15 },  // User Name
				{ wch: 15 },  // Advance Amount
				{ wch: 18 },  // Remaining Amount
				{ wch: 20 },  // Estimated Total Fare
				{ wch: 12 },  // Pickup Date
				{ wch: 12 },  // Pickup Time
				{ wch: 15 },  // Payment Status
				{ wch: 12 },  // Status
				{ wch: 20 },  // Created At
				{ wch: 20 }   // Updated At
			]
			XLSX.utils.book_append_sheet(wb, ws, 'Advance Reservations')
			const timestamp = new Date().toISOString().split('T')[0]
			const filename = `advance_reservations_${timestamp}.xlsx`
			XLSX.writeFile(wb, filename)
			toast.success('Excel file exported successfully')
		} catch (error) {
			console.error('Error exporting to Excel:', error)
			toast.error('Failed to export Excel file')
		}
	}, [transactions, currentPage, perPage])

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

	// Render transaction details
	const renderTransactionDetails = () => {
		if (isLoadingDetails) {
			return (
				<div className="flex justify-center items-center py-8">
					<Loader className="animate-spin" size={32} />
				</div>
			)
		}

		if (!selectedTransaction) {
			return (
				<div className="text-center py-8 text-gray-500">
					No transaction details available
				</div>
			)
		}

		return (
			<div className="space-y-6">
				{/* User Information */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">User Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<span className="text-sm text-gray-600">Name:</span>
							<p className="font-medium">{selectedTransaction.user?.name || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Email:</span>
							<p className="font-medium">{selectedTransaction.user?.email || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Mobile:</span>
							<p className="font-medium">{selectedTransaction.user?.mobile || 'N/A'}</p>
						</div>
					</div>
				</div>

				{/* Transaction Information */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">Transaction Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<span className="text-sm text-gray-600">Transaction ID:</span>
							<p className="font-medium">{selectedTransaction.transaction_id}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Gateway Transaction ID:</span>
							<p className="font-medium">{selectedTransaction.gateway_transaction_id || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Bank Reference:</span>
							<p className="font-medium">{selectedTransaction.bank_ref_num || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Trip Type:</span>
							<p className="font-medium">{selectedTransaction.trip_type}</p>
						</div>
					</div>
				</div>

				{/* Trip Details */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">Trip Details</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{selectedTransaction.package && (
							<div className="md:col-span-2">
								<span className="text-sm text-gray-600">Package:</span>
								<p className="font-medium">{selectedTransaction.package.name} ({selectedTransaction.package.km} km, {selectedTransaction.package.days} days)</p>
							</div>
						)}
						{selectedTransaction.custom_details && (
							<div className="md:col-span-2">
								<span className="text-sm text-gray-600">Custom Trip:</span>
								<p className="font-medium">{selectedTransaction.custom_details.km} km, {selectedTransaction.custom_details.days} days</p>
							</div>
						)}
						<div>
							<span className="text-sm text-gray-600">Vehicle Type:</span>
							<p className="font-medium">{selectedTransaction.vehicle_type?.name || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Pickup Date:</span>
							<p className="font-medium">{new Date(selectedTransaction.pickup_date).toLocaleDateString()}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Pickup Time:</span>
							<p className="font-medium">{selectedTransaction.pickup_time}</p>
						</div>
					</div>
				</div>

				{/* Location Information */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">Location Information</h3>
					<div className="space-y-3">
						<div>
							<span className="text-sm text-gray-600">Pickup Location:</span>
							<p className="font-medium">{selectedTransaction.pickup_location?.address || 'N/A'}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Drop Location:</span>
							<p className="font-medium">{selectedTransaction.drop_location?.address || 'N/A'}</p>
						</div>
					</div>
				</div>

				{/* Payment Information */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">Payment Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<span className="text-sm text-gray-600">Estimated Total Fare:</span>
							<p className="font-medium text-lg">₹{selectedTransaction.estimated_total_fare}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Advance Amount:</span>
							<p className="font-medium text-lg text-green-600">₹{selectedTransaction.advance_amount}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Remaining Amount:</span>
							<p className="font-medium text-lg text-orange-600">₹{selectedTransaction.remaining_amount}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Payment Status:</span>
							<p className="font-medium">
								<span className={`px-2 py-1 rounded-full text-xs ${
									selectedTransaction.payment_status === 'success' ? 'bg-green-100 text-green-800' :
									selectedTransaction.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
									selectedTransaction.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
									'bg-blue-100 text-blue-800'
								}`}>
									{selectedTransaction.payment_status?.toUpperCase()}
								</span>
							</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Status:</span>
							<p className="font-medium">
								<span className={`px-2 py-1 rounded-full text-xs ${
									selectedTransaction.status === 'paid' ? 'bg-green-100 text-green-800' :
									selectedTransaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
									selectedTransaction.status === 'used' ? 'bg-blue-100 text-blue-800' :
									selectedTransaction.status === 'expired' ? 'bg-orange-100 text-orange-800' :
									selectedTransaction.status === 'refunded' ? 'bg-indigo-100 text-indigo-800' :
									'bg-red-100 text-red-800'
								}`}>
									{selectedTransaction.status?.toUpperCase()}
								</span>
							</p>
						</div>
					</div>
				</div>

				{/* Timestamps */}
				<div className="bg-gray-50 p-4 rounded-lg">
					<h3 className="text-lg font-semibold mb-3 text-gray-800">Timeline</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<div>
							<span className="text-sm text-gray-600">Created At:</span>
							<p className="font-medium">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
						</div>
						<div>
							<span className="text-sm text-gray-600">Updated At:</span>
							<p className="font-medium">{new Date(selectedTransaction.updated_at).toLocaleString()}</p>
						</div>
						{selectedTransaction.paid_at && (
							<div>
								<span className="text-sm text-gray-600">Paid At:</span>
								<p className="font-medium">{new Date(selectedTransaction.paid_at).toLocaleString()}</p>
							</div>
						)}
						{selectedTransaction.used_at && (
							<div>
								<span className="text-sm text-gray-600">Used At:</span>
								<p className="font-medium">{new Date(selectedTransaction.used_at).toLocaleString()}</p>
							</div>
						)}
						{selectedTransaction.expires_at && (
							<div>
								<span className="text-sm text-gray-600">Expires At:</span>
								<p className="font-medium">{new Date(selectedTransaction.expires_at).toLocaleString()}</p>
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}

	// DataTable columns
	const columnDefs = useMemo(() => [
		{
			headerName: "S.No",
			width: 80,
			sortable: false,
			valueGetter: (params) => (currentPage - 1) * perPage + (params.node.rowIndex ?? 0) + 1,
		},
		{
			headerName: "Transaction ID",
			field: "transaction_id",
			sortable: true,
			minWidth: 180,
			flex: 1,
		},
		{
			headerName: "User Name",
			field: "user.name",
			sortable: true,
			minWidth: 140,
			flex: 0.8,
		},
		{
			headerName: "Advance Amount",
			field: "advance_amount",
			sortable: true,
			minWidth: 120,
			flex: 0.8,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Remaining Amount",
			field: "remaining_amount",
			sortable: true,
			minWidth: 140,
			flex: 0.8,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Estimated Total Fare",
			field: "estimated_total_fare",
			sortable: true,
			minWidth: 160,
			flex: 1,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Pickup Date",
			field: "pickup_date",
			sortable: true,
			minWidth: 120,
			flex: 0.8,
			valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
		},
		{
			headerName: "Pickup Time",
			field: "pickup_time",
			sortable: true,
			minWidth: 100,
			flex: 0.6,
		},
		{
			headerName: "Payment Status",
			field: "payment_status",
			sortable: true,
			minWidth: 120,
			flex: 0.8,
			cellRenderer: (params) => {
				const statusClass = {
					pending: "bg-yellow-100 text-yellow-800",
					paid: "bg-green-100 text-green-800",
					success: "bg-green-100 text-green-800",
					failed: "bg-red-100 text-red-800",
					refunded: "bg-blue-100 text-blue-800"
				}[params.value] || "bg-gray-100 text-gray-800"
				return (
					<span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
						{params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : ''}
					</span>
				)
			},
		},
		{
			headerName: "Status",
			field: "status",
			sortable: true,
			minWidth: 100,
			flex: 0.8,
			cellRenderer: (params) => {
				const statusClass = {
					pending: "bg-yellow-100 text-yellow-800",
					paid: "bg-green-100 text-green-800",
					used: "bg-blue-100 text-blue-800",
					expired: "bg-orange-100 text-orange-800",
					refunded: "bg-indigo-100 text-indigo-800",
					failed: "bg-red-100 text-red-800"
				}[params.value] || "bg-gray-100 text-gray-800"
				return (
					<span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
						{params.value.charAt(0).toUpperCase() + params.value.slice(1)}
					</span>
				)
			},
		},
		{
			headerName: "Actions",
			field: "actions",
			sortable: false,
			minWidth: 100,
			flex: 0.6,
			cellRenderer: (params) => {
				return (
					<button
						onClick={() => handleViewTransaction(params.data)}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						title="View Details"
					>
						<Eye size={18} className="text-blue-600" />
					</button>
				)
			},
		},
	], [currentPage, perPage, handleViewTransaction])

	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
					Advance Reservation
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
							Advance Reservations
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
					rowData={transactions}
					rowHeight={55}
					pagination
					paginationPageSize={10}
					paginationPageSizeSelector={[10, 20, 50, 100]}
					paginationNumberFormatter={(params) => `${params.value}`}
					suppressCellFocus
					noRowsOverlayComponent={NoRowsOverlay}
					noRowsOverlayComponentParams={{ text: "No Advance Reservations Found" }}
					onPaginationChanged={(params) => {
						if (params.api) {
							const newPage = params.api.paginationGetCurrentPage() + 1
							handlePageChange(newPage)
						}
					}}
				/>
			</div>
			{/* Offcanvas for filters */}
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
								{ value: "pending", label: "Pending" },
								{ value: "paid", label: "Paid" },
								{ value: "used", label: "Used" },
								{ value: "expired", label: "Expired" },
								{ value: "refunded", label: "Refunded" },
								{ value: "failed", label: "Failed" },
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

			{/* View Transaction Modal */}
			<Modal
				isOpen={isViewModalOpen}
				onClose={handleViewModalClose}
				title="Transaction Details"
				size="full"
			>
				{renderTransactionDetails()}
			</Modal>
		</Layout>
	)
}

export default AdvanceReservation