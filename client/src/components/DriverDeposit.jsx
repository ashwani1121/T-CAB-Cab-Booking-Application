import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Download } from "lucide-react"
import Offcanvas from "./Offcanvas"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
import { AgGridReact } from "ag-grid-react"
import * as XLSX from 'xlsx'
function DriverDeposit(){
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
	const [placeholder, setPlaceholder] = useState("Search by transaction...")
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [isDeleting, setIsDeleting] = useState(false)
	const words = ["transaction_id", "description", "status"]

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
				`${import.meta.env.VITE_API_URL}/admin/transactions/driverDeposit`,{
					params: {
						page,
						limit,
						search,
						status: status === "all" ? "" : status,
					},
				}
			)
			if (response.data.success) {
				setTransactions(response.data.data.transactions || [])
				setTotalRows(response.data.data.pagination?.total_records || 0)
			}
		} catch (err) {
			console.error("Error fetching transactions:", err)
			toast.error(err.response?.data?.message || "Failed to fetch transactions")
			setTransactions([])
			setTotalRows(0)
		} finally {
			setIsLoading(false)
		}
	}, [])

	// Handle Excel Export
	const handleExcelExport = useCallback(() => {
		try{
			const exportData = transactions.map((transaction, index) => ({
				'S.No'             : (currentPage - 1) * perPage + index + 1,
				'Transaction ID'   : transaction.transaction_id,
				'Driver ID'        : transaction.driver_id,
				'Transaction Type' : transaction.transaction_type,
				'Amount'           : `$${transaction.amount}`,
				'Balance Before'   : `$${transaction.balance_before}`,
				'Balance After'    : `$${transaction.balance_after}`,
				'Payment Method'   : transaction.payment_method,
				'Status'           : transaction.status,
				'Description'      : transaction.description,
				'Created At'       : new Date(transaction.created_at).toLocaleString(),
				'Updated At'       : new Date(transaction.updated_at).toLocaleString()
			}))
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(exportData)
			ws['!cols'] = [
				{ wch: 8 },   // S.No
				{ wch: 20 },  // Transaction ID
				{ wch: 12 },  // Driver ID
				{ wch: 15 },  // Transaction Type
				{ wch: 12 },  // Amount
				{ wch: 15 },  // Balance Before
				{ wch: 15 },  // Balance After
				{ wch: 15 },  // Payment Method
				{ wch: 12 },  // Status
				{ wch: 30 },  // Description
				{ wch: 20 },  // Created At
				{ wch: 20 }   // Updated At
			]
			XLSX.utils.book_append_sheet(wb, ws, 'Driver Deposits')
			const timestamp = new Date().toISOString().split('T')[0]
			const filename  = `driver_deposits_${timestamp}.xlsx`
			XLSX.writeFile(wb, filename)
			toast.success('Excel file exported successfully')
		}catch(error){
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
			headerName: "Driver Name",
			field: "driver.name",
			sortable: true,
			minWidth: 140,
			flex: 0.5,
		},
        {
            headerName: "Transaction Type",
            field: "transaction_type",
            sortable: true,
            minWidth: 120,
            flex: 1,
            valueFormatter: (params) =>
                params.value ? params.value.replace(/_/g, " ") : "",
        },
		{
			headerName: "Amount",
			field: "amount",
			sortable: true,
			minWidth: 100,
			flex: 0.8,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Balance Before",
			field: "balance_before",
			sortable: true,
			minWidth: 120,
			flex: 1,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Balance After",
			field: "balance_after",
			sortable: true,
			minWidth: 120,
			flex: 1,
			valueFormatter: (params) => `₹${params.value}`,
		},
		{
			headerName: "Payment Method",
			field: "payment_method",
			sortable: true,
			minWidth: 120,
			flex: 1,
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
					completed: "bg-green-100 text-green-800",
					failed: "bg-red-100 text-red-800",
					refunded: "bg-blue-100 text-blue-800"
				}[params.value] || "bg-gray-100 text-gray-800"
				return (
					<span className={`px-2 py-1 rounded-full text-xs ${statusClass}`}>
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
			flex: 1,
			valueFormatter: (params) => new Date(params.value).toLocaleString(),
		}
	], [currentPage, perPage])

	return (
		<Layout>
			{/* Header and breadcrumb */}
			<div className="flex items-center mb-4">
				<h1 className="text-2xl font-bold max-sm:text-xl flex-1">
					Driver Deposit
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
							Driver Deposits
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
					noRowsOverlayComponentParams={{ text: "No Transactions Found" }}
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
							value={ statusFilter }
							onChange={(selected) => {
								setStatusFilter(selected?.value || "")
								setCurrentPage(1)
							}}
							options={[
								{ value: "pending", label: "Pending" },
								{ value: "completed", label: "Completed" },
								{ value: "failed", label: "Failed" },
								{ value: "refunded", label: "Refunded" },
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
		</Layout>
	)
}
export default DriverDeposit