"use client";
import { useMemo, useState } from "react";
import {
  Card,
  Button,
  SearchBar,
  Select,
  DataRangePicker,
  DataTable,
  Badge,
} from "../ui";

export const MainPage = () => {
  const handleDetail = (row: any) => {
  };
  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    {
      header: "Status",
      accessor: "status",
      render: (value: string) => (
        <Badge colorScheme={value === "Active" ? "green" : "red"}>
          {value}
        </Badge>
      ),
    },
    { header: "Role", accessor: "role" },
    {
      header: "Actions",
      accessor: "actions",
      render: (value: any, row: any) => (
        <div className="flex space-x-2">
          <Button
            size="small"
            variant="outline"
            onClick={() => handleDetail(row)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  // Sample data for table
  const sampleData = [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      status: "Active",
      role: "Admin",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      status: "Inactive",
      role: "User",
    },
    {
      id: 4,
      name: "Alice Brown",
      email: "alice@example.com",
      status: "Active",
      role: "Moderator",
    },
    {
      id: 5,
      name: "Charlie Wilson",
      email: "charlie@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 6,
      name: "John Doe",
      email: "john@example.com",
      status: "Active",
      role: "Admin",
    },
    {
      id: 7,
      name: "Jane Smith",
      email: "jane@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 8,
      name: "Bob Johnson",
      email: "bob@example.com",
      status: "Inactive",
      role: "User",
    },
    {
      id: 9,
      name: "Alice Brown",
      email: "alice@example.com",
      status: "Active",
      role: "Moderator",
    },
    {
      id: 10,
      name: "Charlie Wilson",
      email: "charlie@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 11,
      name: "John Doe",
      email: "john@example.com",
      status: "Active",
      role: "Admin",
    },
    {
      id: 12,
      name: "Jane Smith",
      email: "jane@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 13,
      name: "Bob Johnson",
      email: "bob@example.com",
      status: "Inactive",
      role: "User",
    },
    {
      id: 14,
      name: "Alice Brown",
      email: "alice@example.com",
      status: "Active",
      role: "Moderator",
    },
    {
      id: 15,
      name: "Charlie Wilson",
      email: "charlie@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 16,
      name: "John Doe",
      email: "john@example.com",
      status: "Active",
      role: "Admin",
    },
    {
      id: 17,
      name: "Jane Smith",
      email: "jane@example.com",
      status: "Active",
      role: "User",
    },
    {
      id: 18,
      name: "Bob Johnson",
      email: "bob@example.com",
      status: "Inactive",
      role: "User",
    },
    {
      id: 19,
      name: "Alice Brown",
      email: "alice@example.com",
      status: "Active",
      role: "Moderator",
    },
    {
      id: 20,
      name: "Will Wilson",
      email: "charlie@example.com",
      status: "Active",
      role: "User",
    },
  ];

  const selectOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  // Event handlers
  const handleDateChange = (dates: { startDate: Date; endDate: Date }) => {
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
  };
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10 baris

  // Fungsi untuk membatasi data berdasarkan page size
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sampleData.slice(startIndex, endIndex);
  }, [currentPage, pageSize, sampleData]);

  // Hitung total pages
  const totalPages = Math.ceil(sampleData.length / pageSize);

  // Event handlers
  const handleSearch = (query: string) => {
    // Implement search logic here
  };
  return (
    <div>
      {/* Table Demo */}
      <Card
        title="Data Table Component"
        headerActions={
          <div className="flex space-x-2">
            <Button variant="secondary">List</Button>
            <Button>Add New</Button>
          </div>
        }
      >
        <div className="flex flex-col">
          {/* Responsive controls for filtering and search */}
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={handleSearch}
                placeholder="Search..."
                className="w-full sm:w-44" // Full width on mobile, constrained on larger screens
              />
              <DataRangePicker
                startDate={startDate}
                endDate={endDate}
                onDatesChange={handleDateChange}
                className="w-full sm:w-82" // Full width on mobile, constrained on larger screens
              />
            </div>
            <div className="w-full md:w-auto md:ml-auto">
              {/* <Select
                options={selectOptions}
                label="Choose an Option"
                name="option"
                placeholder="— Select an Option —"
                className="w-full md:w-64" // Full width on mobile, constrained on larger screens
              /> */}
            </div>
          </div>
          {/* Responsive data table with horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <DataTable
              enableFiltering={false}
              columns={columns}
              data={paginatedData} // Gunakan data yang sudah dipaginasi
              isLoading={isTableLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sampleData.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize} // Tambahkan handler untuk mengubah page size
              emptyMessage="No users found"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
