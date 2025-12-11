import { ManagementContent, ManagementHeader } from "@/components/ui";
import { UserRole } from "@prisma/client";
import { getUsers } from "@/lib/actions/user";

// Columns Definition
const columns = [
  { header: "Name", accessor: "name" },
  { header: "Email", accessor: "email" },
  { header: "Role", accessor: "role" },
  { header: "Status", accessor: "status" },
  { header: "password", accessor: "password" },
];

// Define the excluded accessors as an array
const excludedAccessors = ["name", "email", "role", "status", "isActive"];

export default async function Page() {
  const users = await getUsers();

  // Transform users data to include status as string for display
  const transformedUsers = users.map(user => ({
    ...user,
    status: user.isActive ? "Active" : "Inactive"
  }));

  return (
    <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <ManagementHeader
        headerTittle="Management User"
        mainPageName="/management/users"
        allowedRoles={["ADMIN", "OWNER"]}
      />
      <ManagementContent
        linkPath="/management/users"
        sampleData={transformedUsers}
        columns={columns}
        excludedAccessors={excludedAccessors}
        dateAccessor="createdAt"
        emptyMessage="No users found"
      />
    </div>
  );
}
