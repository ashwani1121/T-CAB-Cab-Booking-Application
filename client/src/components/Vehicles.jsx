import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Edit, Search, Filter, Eye, Trash2, Plus, Clock } from "lucide-react"
import Modal from "./Modal"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import { format } from "date-fns"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])
function Vehicles() {
    const { theme } = useTheme()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [perPage, setPerPage] = useState(10)
    const [currentPage, setCurrentPage] = useState(1)
    const [vehicles, setVehicles] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen] = useState(false)
    const [backendErrors, setBackendErrors] = useState({})
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        vehicleImage: null,
        deposit: "",
        status: 1
    })
    const [vehicleImagePreview, setVehicleImagePreview] = useState("")
    const [vehicleImageRemoved, setVehicleImageRemoved] = useState(false)
    const [placeholder, setPlaceholder] = useState("Search by name...")
    const [currentWordIndex, setCurrentWordIndex] = useState(0)
    const [currentCharIndex, setCurrentCharIndex] = useState(0)
    const [isDeleting, setIsDeleting] = useState(false)
    const words = ["name", "deposit"]

    // Initialize permissions with safe defaults
    const [vehiclesPermissions, setVehiclesPermissions] = useState({
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_view: false
    })

    // Get user permissions for the vehicles module 
    const getUserPermissions = useCallback(() => {
        try {
            const permissionsStr = localStorage.getItem('userPermissions')
            if (permissionsStr) {
                const permissions = JSON.parse(permissionsStr)
                if (permissions.vehicles) {
                    return {
                        can_add: permissions.vehicles.can_add || false,
                        can_edit: permissions.vehicles.can_edit || false,
                        can_delete: permissions.vehicles.can_delete || false,
                        can_view: permissions.vehicles.can_view || false
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
        setVehiclesPermissions(permissions)
    }, [getUserPermissions])

    // Listen for permission updates from other components
    useEffect(() => {
        const handlePermissionsUpdate = () => {
            const permissions = getUserPermissions()
            setVehiclesPermissions(permissions)
        }
        window.addEventListener('permissionsUpdated', handlePermissionsUpdate)
        return () => {
            window.removeEventListener('permissionsUpdated', handlePermissionsUpdate)
        }
    }, [getUserPermissions])

    // Typing animation for placeholder
    useEffect(() => {
        const typingSpeed = isDeleting ? 50 : 100
        const pauseTime = 1500
        const timeout = setTimeout(() => {
            const currentWord = words[currentWordIndex]
            if (!isDeleting && currentCharIndex < currentWord.length) {
                setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex + 1)}...`)
                setCurrentCharIndex((prev) => prev + 1)
            } else
                if (isDeleting && currentCharIndex > 0) {
                    setPlaceholder(`Search by ${currentWord.substring(0, currentCharIndex - 1)}...`)
                    setCurrentCharIndex((prev) => prev - 1)
                } else
                    if (!isDeleting && currentCharIndex === currentWord.length) {
                        setTimeout(() => setIsDeleting(true), pauseTime)
                    } else
                        if (isDeleting && currentCharIndex === 0) {
                            setIsDeleting(false)
                            setCurrentWordIndex((prev) => (prev + 1) % words.length)
                        }
        }, typingSpeed)
        return () => clearTimeout(timeout)
    }, [currentCharIndex, currentWordIndex, isDeleting, words])

    // Inside your Vehicles function
    const fetchVehicles = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicles`, {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: searchQuery,
                    status: statusFilter === "all" ? "" : statusFilter,
                    _t: Date.now(),
                },
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            });

            if (response.data.success) {
                setVehicles(response.data.data.vehicles || []);
                setTotalRows(response.data.data.pagination.total_records || 0);
            } else {
                toast.error("Failed to fetch vehicles");
                setVehicles([]);
                setTotalRows(0);
            }
        } catch (err) {
            console.error("Error fetching vehicles:", err);
            toast.error(err.response?.data?.message || "Failed to fetch vehicles");
            setVehicles([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, perPage, searchQuery, statusFilter]);

    useEffect(() => {
        fetchVehicles()
    }, [fetchVehicles])

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))
        setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Handle file change
    const handleVehicleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setFormData((prev) => ({
                ...prev,
                vehicleImage: file,
            }))
            const reader = new FileReader()
            reader.onload = (e) => {
                setVehicleImagePreview(e.target.result)
            }
            reader.readAsDataURL(file)
            setVehicleImageRemoved(false)
        }
        setBackendErrors((prev) => ({ ...prev, vehicleImage: "" }))
    }

    // Handle delete image
    const handleVehicleImageDelete = () => {
        setFormData((prev) => ({
            ...prev,
            vehicleImage: null,
        }))
        setVehicleImagePreview("")
        setVehicleImageRemoved(true)
        const fileInput = document.getElementById("vehicleImage")
        if (fileInput) {
            fileInput.value = ""
        }
        setBackendErrors((prev) => ({ ...prev, vehicleImage: "" }))
    }

    // Handle status change
    const handleStatusChange = (selectedOption) => {
        if (selectedOption) {
            setFormData((prev) => ({
                ...prev,
                status: selectedOption.value,
            }))
        }
        setBackendErrors((prev) => ({ ...prev, status: "" }))
    }

    // Handle add vehicle
    const handleAddVehicleClick = () => {
        if (!vehiclesPermissions.can_add) {
            toast.error("You don't have permission to create vehicles")
            return
        }
        setEditingVehicle({ isNew: true })
        setFormData({
            name: "",
            vehicleImage: null,
            description: "",
            deposit: "",
            status: 1,
        })
        setVehicleImagePreview("")
        setVehicleImageRemoved(false)
        setBackendErrors({})
        setIsModalOpen(true)
    }

    // Handle edit vehicle
    const handleEditVehicleClick = useCallback((vehicle) => {
        if (!vehiclesPermissions.can_edit) {
            toast.error("You don't have permission to edit vehicles")
            return
        }
        setEditingVehicle(vehicle)
        setFormData({
            name: vehicle.name,
            vehicleImage: null,
            description: vehicle.description || "",
            deposit: vehicle.deposit || "",
            status: vehicle.status
        })
        setVehicleImagePreview(vehicle.image || "")
        setVehicleImageRemoved(false)
        setBackendErrors({})
        setIsModalOpen(true)
    }, [vehiclesPermissions.can_edit])

    // Handle search
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setBackendErrors({})
        try {
            const submitData = new FormData()
            submitData.append("name", formData.name)
            submitData.append("description", formData.description || "")
            submitData.append("deposit", formData.deposit)
            submitData.append("status", formData.status)
            if (formData.vehicleImage instanceof File) {
                submitData.append("image", formData.vehicleImage)
            }
            if (!editingVehicle?.isNew && vehicleImageRemoved) {
                submitData.append("imageRemoved", "true")
            }
            let response
            if (editingVehicle?.isNew) {
                response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/vehicles`, submitData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
            } else {
                response = await axios.put(`${import.meta.env.VITE_API_URL}/admin/vehicles/${editingVehicle.id}`, submitData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
            }
            if (response.data.success) {
                toast.success(response.data.message || (editingVehicle?.isNew ? "Vehicle created successfully" : "Vehicle updated successfully"))
                setIsModalOpen(false)
                setEditingVehicle(null)
                setFormData({
                    name: "",
                    description: "",
                    vehicleImage: null,
                    deposit: "",
                    status: 1
                })
                setVehicleImagePreview("")
                setVehicleImageRemoved(false)
                fetchVehicles()
            } else {
                toast.error(response.data.message || "Failed to save vehicle")
                if (response.data.errors) {
                    setBackendErrors(response.data.errors)
                }
            }
        } catch (err) {
            console.error("Error saving vehicle:", err)
            const errorMessage = err.response?.data?.message || "Failed to save vehicle"
            toast.error(errorMessage)
            if (err.response?.data?.errors) {
                setBackendErrors(err.response.data.errors)
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Handle delete vehicle
    const handleDeleteVehicleClick = useCallback(async (id) => {
        if (!vehiclesPermissions.can_delete) {
            toast.error("You don't have permission to delete vehicles")
            return
        }
        if (window.confirm("Are you sure you want to delete this vehicle?")) {
            try {
                const response = await axios.delete(`${import.meta.env.VITE_API_URL}/admin/vehicles/${id}`)
                if (response.data.success) {
                    toast.success("Vehicle deleted successfully")
                    fetchVehicles()
                }
            } catch (err) {
                toast.error(err.response?.status === 404 ? "Vehicle not found." : "Failed to delete vehicle.")
                console.error("Delete vehicle error:", err)
            }
        }
    }, [vehiclesPermissions.can_delete, fetchVehicles])

    // Handle modal close
    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingVehicle(null)
        setFormData({
            name: "",
            description: "",
            vehicleImage: null,
            deposit: "",
            status: 1
        })
        setVehicleImagePreview("")
        setVehicleImageRemoved(false)
        setBackendErrors({})
    }

    // Reset filters
    const resetFilters = () => {
        setSearchQuery("")
        setStatusFilter("")
        setCurrentPage(1)
        setIsFilterOffcanvasOpen(false)
    }

    // DataTable columns - with conditional Actions column
    const columnDefs = useMemo(() => {
        const baseColumns = [
            {
                headerName: "S.No",
                valueGetter: (params) => (currentPage - 1) * perPage + params.node.rowIndex + 1,
                width: 100,
                sortable: false,
            },
            {
                headerName: "Image",
                field: "image",
                minWidth: 150,
                sortable: false,
                filter: false,
                cellRenderer: (params) => {
                    if (!params.data?.image) return (
                        <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                            <span className="text-xs text-gray-500">No Image</span>
                        </div>
                    )
                    return (
                        <img
                            src={params.data.image}
                            alt={params.data.name || "Vehicle"}
                            className="w-10 h-10 object-contain rounded-md"
                        />
                    )
                },
            },
            {
                headerName: "Vehicle",
                field: "name",
                cellRenderer: (params) => (
                    <div className="text-left">
                        <h3 className="font-medium text-lg">{params.data?.name}</h3>
                        <p className="text-sm text-gray-500 truncate">
                            {params.data?.description || "No description"}
                        </p>
                    </div>
                ),
                sortable: true,
                minWidth: 200,
                flex: 1,
            },
            {
                headerName: "Deposit",
                field: "deposit",
                cellRenderer: (params) => (
                    <span className="font-medium">₹{params.value || 0}</span>
                ),
                sortable: true,
                minWidth: 120,
                flex: 1,
            },
            {
                headerName: "Status",
                field: "status",
                cellRenderer: (params) => {
                    const isActive = params.value === 1
                    return (
                        <span className={`px-2 py-1 rounded-full text-xs ${isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}>
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    )
                },
                minWidth: 120,
                flex: 1,
            },
            {
                headerName: "Last Updated",
                field: "updated_at",
                cellRenderer: (params) => (
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        <p className="text-xs text-gray-600">
                            {params.data?.updated_at ?
                                format(new Date(params.data.updated_at), "MMM d, yyyy h:mm a") :
                                "N/A"
                            }
                        </p>
                    </div>
                ),
                sortable: true,
                minWidth: 180,
                flex: 1,
            },
        ]
        // Only add Actions column if user has edit or delete permission
        if (vehiclesPermissions.can_edit || vehiclesPermissions.can_delete) {
            baseColumns.push({
                headerName: "Actions",
                field: "actions",
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2">
                        {vehiclesPermissions.can_edit && (
                            <button
                                onClick={() => handleEditVehicleClick(params.data)}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit"
                            >
                                <Edit size={16} style={{ color: theme.primaryGradientStart }} />
                            </button>
                        )}
                        {vehiclesPermissions.can_delete && (
                            <button
                                onClick={() => handleDeleteVehicleClick(params.data.id)}
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
    }, [theme.primaryGradientStart, theme.secondaryGradientStart, currentPage, perPage, vehiclesPermissions, handleEditVehicleClick, handleDeleteVehicleClick])

    // Render vehicle form
    const renderVehicleForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6 p-4">
            <div className="grid md:grid-cols-3 gap-4">
                <ThemeUI.FormField
                    label="Vehicle Name"
                    name="name"
                    error={backendErrors.name}
                    required
                >
                    <ThemeUI.Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Car"
                        error={backendErrors.name}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label="Description"
                    name="description"
                    error={backendErrors.description}
                >
                    <ThemeUI.Textarea
                        id="description"
                        name="description"
                        rows="2"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter vehicle description"
                        error={backendErrors.description}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label="Vehicle Image"
                    name="vehicleImage"
                    error={backendErrors.vehicleImage}
                    required
                >
                    <ThemeUI.FileInput
                        id="vehicleImage"
                        name="vehicleImage"
                        onChange={handleVehicleImageChange}
                        accept="image/png,image/jpeg,image/jpg"
                        preview={vehicleImagePreview}
                        onDelete={handleVehicleImageDelete}
                        error={backendErrors.vehicleImage}
                        showDeleteIcon={false}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label="Security Deposit"
                    name="deposit"
                    error={backendErrors.deposit}
                    required
                >
                    <ThemeUI.Input
                        id="deposit"
                        name="deposit"
                        type="number"
                        value={formData.deposit}
                        onChange={handleInputChange}
                        placeholder="e.g., 500"
                        error={backendErrors.deposit}
                    />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                    label="Status"
                    name="status"
                    error={backendErrors.status}
                    required
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
                        isSearchable={false}
                    />
                </ThemeUI.FormField>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <ThemeUI.Button
                    type="button"
                    onClick={handleModalClose}
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
                    {editingVehicle?.isNew ? "Create Vehicle" : "Update Vehicle"}
                </ThemeUI.Button>
            </div>
        </form>
    )

    return (
        <Layout>
            {/* Header and breadcrumb */}
            <div className="flex items-center mb-4">
                <h1 className="text-2xl font-bold max-sm:text-xl flex-1">Vehicles</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">
                                Home
                            </a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Vehicles
                        </li>
                    </ol>
                </nav>
            </div>
            {/* Search and filter controls */}
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
                        {vehiclesPermissions.can_add && (
                            <ThemeUI.Button
                                type="button"
                                onClick={handleAddVehicleClick}
                                gradientColors={{
                                    start: theme.primaryGradientStart,
                                    end: theme.primaryGradientEnd,
                                }}
                                direction={theme.gradientDirection}
                            >
                                <Plus size={16} className="sm:mr-2" />
                                <p className="max-sm:hidden">Add Vehicle</p>
                            </ThemeUI.Button>
                        )}
                    </div>
                </div>
            </div>
            {/* AG Grid - DataTable */}
            <div style={{ "--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})` }}>
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
                        sortable: true,
                    }}
                    rowData={vehicles}
                    rowHeight={55}
                    columnDefs={columnDefs}
                    pagination={true}
                    paginationPageSize={perPage}
                    suppressPaginationPanel={false}
                    paginationPageSizeSelector={[10, 20, 50, 100]}
                    onPaginationChanged={(params) => {
                        if (params.api && params.newPage) {
                            const newPage = params.api.paginationGetCurrentPage() + 1;
                            if (newPage !== currentPage) {
                                handlePageChange(newPage);
                            }
                        }
                    }}
                    onComponentStateChanged={(params) => {
                        const gridPerPage = params.api.paginationGetPageSize();
                        if (gridPerPage !== perPage) {
                            setPerPage(gridPerPage);
                            setCurrentPage(1);
                        }
                    }}
                    suppressCellFocus
                    noRowsOverlayComponent={NoRowsOverlay}
                    noRowsOverlayComponentParams={{ text: "No Vehicles Found" }}
                />
            </div>
            {/* Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                title={editingVehicle?.isNew ? "Add New Vehicle" : "Edit Vehicle"}
                size="XL"
            >
                {renderVehicleForm()}
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
                            placeholder="Filter by status"
                            isClearable
                            isSearchable={false}
                        />
                    </ThemeUI.FormField>
                    <div className="flex gap-2">
                        <ThemeUI.Button
                            type="button"
                            onClick={resetFilters}
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
export default Vehicles