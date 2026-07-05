import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Plus, Trash2, Lock } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"

function Packages() {
    const { theme } = useTheme()

    // State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [perPage, setPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [packages, setPackages] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
    const [backendErrors, setBackendErrors] = useState({})
    const [editingPackage, setEditingPackage] = useState(null)
    const [placeholder, setPlaceholder] = useState("Search by name...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)

    const words = ["name", "km", "status"]

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        km: "",
        advance:"",
        status: 1,
    })

    // Permissions
    const [packagePermissions, setPackagePermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false,
    })

    // Get user permissions
    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem("userPermissions")
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr)
                if (permissions.packages) {
                    return {
                        can_add: permissions.packages.can_add || false,
                        can_edit: permissions.packages.can_edit || false,
                        can_delete: permissions.packages.can_delete || false,
                        can_view: permissions.packages.can_view || false,
                    }
                }
            }
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        } catch (error) {
            console.error("Error parsing user permissions:", error)
            return { can_add: false, can_edit: false, can_delete: false, can_view: false }
        }
    }, [])

    // Load permissions on mount
    useEffect(() => {
        const permissions = getUserPermissions()
        setPackagePermissions(permissions)
    }, [getUserPermissions])

    // Listen for permission updates
    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const permissions = getUserPermissions()
            setPackagePermissions(permissions)
        }
        window.addEventListener("permissionsUpdated", handlePermissionsUpdate)
        return () => window.removeEventListener("permissionsUpdated", handlePermissionsUpdate)
    }, [getUserPermissions])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Fetch packages
    const fetchPackages = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/admin/packages`,
                {
                    params: {
                        page: currentPage,
                        limit: perPage,
                        search: searchQuery,
                        status: statusFilter === "all" ? "" : statusFilter,
                    },
                }
            )
            if (response.data.success) {
                setPackages(response.data.data.packages || [])
                setTotalRows(response.data.data.pagination?.total_records || 0)
            } else {
                toast.error("Failed to fetch packages")
                setPackages([])
                setTotalRows(0)
            }
        } catch (err) {
            console.error("Error fetching packages:", err)
            toast.error(err.response?.data?.message || "Failed to fetch packages")
            setPackages([])
            setTotalRows(0)
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, perPage, searchQuery, statusFilter])

    // Trigger fetch
    useEffect(() => {
        fetchPackages()
    }, [fetchPackages])

    // Typing animation
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

    // Input change
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Status change
    const handleStatusChange = (selectedOption) => {
        setFormData((prev) => ({ ...prev, status: selectedOption?.value ?? 1 }))
        setBackendErrors((prev) => ({ ...prev, status: "" }))
    }

    // Search
    const handleSearchChange = (e) => setSearchQuery(e.target.value)

    // Pagination
    const handlePageChange = (page) => setCurrentPage(page)
    const handlePerRowsChange = (newPerPage, page) => {
        setPerPage(newPerPage)
        setCurrentPage(page)
    }

    // In validateForm function
    const validateForm = () => {
        const errors = {}     
        if (!formData.name.trim()) errors.name = "Package name is required"
        if (!formData.km || formData.km <= 0) errors.km = "Distance must be greater than 0"
        if (!formData.advance || formData.advance < 1 || formData.advance > 100) {
            errors.advance = "Advance percentage must be between 1 and 100"
        }
        return errors
    }

    // Handle Add
    const handleAddClick = () => {
        if (!packagePermissions.can_add) {
            toast.error("You don't have permission to create packages")
            return
        }
        setEditingPackage({ isNew: true })
        setFormData({ name: "", km: "", advance:"" , status: 1 })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle Edit
    const handleEditClick = (pkg) => {
        if (!packagePermissions.can_edit) {
            toast.error("You don't have permission to edit packages")
            return
        }
        setEditingPackage(pkg)
        setFormData({
            name: pkg.name || "",
            km: pkg.km || "",
            advance:pkg.advance || "",
            status: pkg.status == 1 ? 1 : 0,
        })
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle Delete
    const handleDeleteClick = async (pkg) => {
        if (!packagePermissions.can_delete) {
            toast.error("You don't have permission to delete packages")
            return
        }
        if (!window.confirm(`Are you sure you want to delete package "${pkg.name}"?`)) return

        setIsLoading(true)
        try {
            const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/packages/${pkg.id}`)
            if (response.data.success) {
                toast.success("Package deleted successfully")
                fetchPackages()
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete package")
        } finally {
            setIsLoading(false)
        }
    }

    // Submit form
    const handleSubmit = async (e) => {
        e?.preventDefault()

        const errors = validateForm()
        if (Object.keys(errors).length > 0) {
            setBackendErrors(errors)
            return
        }

        setIsLoading(true)
        try {
            const isNew = editingPackage?.isNew
            const url = isNew
                ? `${import.meta.env.VITE_API_URL}/admin/packages`
                : `${import.meta.env.VITE_API_URL}/admin/packages/${editingPackage.id}`
            const method = isNew ? "post" : "put"

            const response = await axios[method](url, formData)

            if (response.data.success) {
                toast.success(isNew ? "Package created successfully" : "Package updated successfully")
                handleModalClose()
                fetchPackages()
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to save package"
            toast.error(msg)
            if (err.response?.data?.errors) {
                setBackendErrors(err.response.data.errors)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Close modal
    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingPackage(null)
        setFormData({ name: "", km: "", advance:"", status: 1 })
        setBackendErrors({})
    }

    // Render form
    const renderPackageForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
            <div className="grid md:grid-cols-4 gap-4">
                <ThemeUI.FormField label="Package Name" name="name" error={backendErrors.name} required>
                    <ThemeUI.Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Silver Plan"
                        error={backendErrors.name}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField label="Distance (KM)" name="km" error={backendErrors.km} required>
                    <ThemeUI.Input
                        id="km"
                        name="km"
                        type="number"
                        min="1"
                        value={formData.km}
                        onChange={handleInputChange}
                        placeholder="e.g., 150"
                        error={backendErrors.km}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField label="Advance payment (%)" name="advance" error={backendErrors.advance} required>
                    <ThemeUI.Input
                        id="advance"
                        name="advance"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.advance}
                        onChange={handleInputChange}
                        placeholder="e.g., 50"
                        error={backendErrors.advance}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField label="Status" name="status" error={backendErrors.status} required>
                    <ThemeUI.Select
                        value={formData.status}
                        onChange={handleStatusChange}
                        options={[
                            { value: 1, label: "Active" },
                            { value: 0, label: "Inactive" },
                        ]}
                        placeholder="Select status"
                        error={backendErrors.status}
                        isSearchable={false}
                    />
                </ThemeUI.FormField>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <ThemeUI.Button
                    type="button"
                    onClick={handleModalClose}
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
                    {editingPackage?.isNew ? "Create Package" : "Update Package"}
                </ThemeUI.Button>
            </div>
        </form>
    )

    // AG Grid columns
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                valueGetter: (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
                width: 70,
                sortable: false,
            },
            {
                headerName: "Package Name",
                field: "name",
                sortable: true,
                flex: 1,
                minWidth: 180,
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        <span>{params.value}</span>
                    </div>
                ),
            },
            {
                headerName: "Distance",
                field: "km",
                sortable: true,
                flex: 1,
                minWidth: 120,
                cellRenderer: (params) => (params.value ? `${params.value} km` : "-"),
            },
            {
                headerName: "Advance Payment (%)",
                field: "advance",
                sortable: true,
                flex: 1,
                minWidth: 120,
                cellRenderer: (params) => (params.value ? `${params.value}%` : "-"),
            },
            {
                headerName: "Status",
                field: "status",
                sortable: true,
                minWidth: 110,
                flex: 1,
                cellRenderer: (params) => {
                    const isActive = params.value === 1
                    return (
                        <span
                            className={`px-2 py-1 rounded-full text-xs ${
                                isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                        >
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    )
                },
            },
        ]

        if (packagePermissions.can_edit || packagePermissions.can_delete) {
            baseColumns.push({
                headerName: "Actions",
                field: "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {packagePermissions.can_edit && (
                            <button
                                onClick={() => handleEditClick(params.data)}
                                className={`p-1 transition-colors` }
                                title={"Edit"}
                                aria-label="Edit package"
                            >
                                <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                            </button>
                        )}
                        {packagePermissions.can_delete && (
                            <button
                                onClick={() => handleDeleteClick(params.data)}
                                className={`p-1 transition-colors`}
                                title={"Delete"}
                                aria-label="Delete package"
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
    }, [currentPage, perPage, packagePermissions, theme.primaryGradientStart, handleEditClick])

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Package Management</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li><a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a></li>
                        <li className="flex items-center"><ChevronRight className="h-4 w-4 mx-1" /></li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">Packages</li>
                    </ol>
                </nav>
            </div>

            {/* Search & Filter & Add */}
            <div className="mb-4 rounded-lg w-full">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="w-full sm:w-1/3">
                        <ThemeUI.Input
                            id="search"
                            name="search"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder={placeholder}
                            leftElement={<Search size={16} className="text-gray-400" />}
                            className="bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <ThemeUI.Button
                            type="button"
                            onClick={() => setIsFilterOffcanvasOpen(true)}
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                            direction={theme.gradientDirection}
                            aria-label="Open filters"
                        >
                            <Filter size={16} className="sm:mr-2" />
                            <span className="max-sm:hidden">Filters</span>
                        </ThemeUI.Button>

                        {packagePermissions.can_add && (
                            <ThemeUI.Button
                                type="button"
                                onClick={handleAddClick}
                                gradientColors={{ start: theme.primaryGradientStart, end: theme.primaryGradientEnd }}
                                direction={theme.gradientDirection}
                                aria-label="Add new package"
                            >
                                <Plus size={16} className="mr-2" /> Add Package
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Skeleton or Grid */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 bg-gray-100 animate-pulse rounded" />
                    ))}
                </div>
            ) : (
                <div
                    style={{
                        "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
                    }}
                >
                    <AgGridReact
                        className="custom-ag-grid"
                        domLayout="autoHeight"
                        theme={themeQuartz.withParams({
                            spacing: 7,
                            headerHeight: 45,
                            headerFontSize: 16,
                            fontSize: 13,
                            headerTextColor: "white",
                        })}
                        defaultColDef={{ resizable: false, suppressSizeToFit: false }}
                        rowData={packages}
                        rowHeight={55}
                        columnDefs={columnDefs}
                        getRowId={(params) => params.data.id}
                        suppressCellFocus
                        noRowsOverlayComponent={NoRowsOverlay}
                        noRowsOverlayComponentParams={{ text: "No Packages Found" }}
                        pagination
                        paginationPageSize={perPage}
                        paginationPageSizeSelector={[10, 20, 50, 100]}
                        onPaginationChanged={(params) => {
                            if (params.api) {
                                const page = params.api.paginationGetCurrentPage() + 1
                                const rows = params.api.paginationGetPageSize()
                                handlePageChange(page)
                                handlePerRowsChange(rows, page)
                            }
                        }}
                    />
                </div>
            )}

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                title={editingPackage?.isNew ? "Add Package" : "Edit Package"}
                size="full"
            >
                {renderPackageForm()}
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
                                { value: "1", label: "Active" },
                                { value: "0", label: "Inactive" },
                            ]}
                            placeholder="All statuses"
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
                            gradientColors={{ start: theme.secondaryGradientStart, end: theme.secondaryGradientEnd }}
                            direction={theme.gradientDirection}
                        >
                            Reset Filters
                        </ThemeUI.Button>
                    </div>
                </div>
            </Offcanvas>
        </Layout>
    )
}

export default Packages