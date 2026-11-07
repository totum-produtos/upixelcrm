import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Shield, Ban, FileText } from "lucide-react";
import { EditRoleDialog } from "@/components/users/EditRoleDialog";
import { AddMemberDialog } from "@/components/users/AddMemberDialog";
import { CreateUserDialog } from "@/components/users/CreateUserDialog";
import { UsersStats } from "@/components/users/UsersStats";
import { UsersListTab } from "@/components/users/UsersListTab";
import { OrgsTab } from "@/components/users/OrgsTab";
import { PermissionMatrixTab } from "@/components/users/PermissionMatrixTab";
import { AuditLogTab } from "@/components/users/AuditLogTab";
import { useUserActions } from "@/hooks/useUserActions";
import { useUsersData } from "@/hooks/useUsersData";
import { useUsersListFilters } from "@/hooks/useUsersListFilters";

export default function UsersPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();


  
  const isMaster = user?.role === "master";
  const currentTenantId = tenant?.id || user?.tenant_id || null;

  const { profiles, orgs, loading, auditLogs, auditLoading, fetchData, fetchAuditLogs } =
    useUsersData({ user, isMaster, currentTenantId });

  const {
    editModal, setEditModal, editRole, setEditRole,
    addMemberModal, setAddMemberModal, addMemberEmail, setAddMemberEmail, addingMember,
    createUserModal, setCreateUserModal, createUserForm, setCreateUserForm, creatingUser,
    toggleBlock, deleteUser, approveUser, createUser, saveRole,
    deleteOrg, handleAddMember, handleRemoveMember,
  } = useUserActions({ user, isMaster, currentTenantId, profiles, fetchData, fetchAuditLogs });


  const {
    search, setSearch, filteredProfiles,
    orgSearch, setOrgSearch, filteredOrgs,
    expandedOrg, toggleExpandedOrg,
  } = useUsersListFilters(profiles, orgs);


  const stats = [
    { label: "Total Usuários", value: profiles.length, icon: Users },
    { label: "Bloqueados", value: profiles.filter(p => p.is_blocked).length, icon: Ban },
    ...(isMaster ? [
      { label: "Empresas", value: orgs.length, icon: Building2 },
      { label: "Masters", value: profiles.filter(p => p.role === "master").length, icon: Shield },
    ] : [
      { label: "Supervisores", value: profiles.filter(p => p.role === "supervisor").length, icon: Shield },
      { label: "Vendedores", value: profiles.filter(p => p.role === "vendedor").length, icon: Users },
    ])
  ];

  return (
    <AppLayout title="Usuários & Permissões" subtitle="Gerencie acesso, as permissões e sua equipe">
      <div className="animate-fade-in space-y-6 p-6">
        <UsersStats stats={stats} />

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="users" className="text-xs gap-1.5"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
            {isMaster && <TabsTrigger value="orgs" className="text-xs gap-1.5"><Building2 className="h-3 w-3" /> Empresas</TabsTrigger>}
            <TabsTrigger value="roles" className="text-xs gap-1.5"><Shield className="h-3 w-3" /> Matriz de Permissões</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="h-3 w-3" /> Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersListTab
              loading={loading}
              profiles={filteredProfiles}
              search={search}
              onSearchChange={setSearch}
              isMaster={isMaster}
              user={user}
              onCreateUser={() => setCreateUserModal(true)}
              onApprove={approveUser}
              onEditRole={(p) => { setEditModal(p); setEditRole(p.role || "vendedor"); }}
              onToggleBlock={toggleBlock}
              onDelete={deleteUser}
            />
          </TabsContent>

          {isMaster && (
            <TabsContent value="orgs">
              <OrgsTab
                loading={loading}
                orgs={filteredOrgs}
                orgSearch={orgSearch}
                onOrgSearchChange={setOrgSearch}
                expandedOrg={expandedOrg}
                onToggleExpanded={toggleExpandedOrg}
                onAddMember={(o) => { setAddMemberModal(o); setAddMemberEmail(""); }}
                onDeleteOrg={deleteOrg}
                onRemoveMember={handleRemoveMember}
              />
            </TabsContent>
          )}

          <TabsContent value="roles">
            <PermissionMatrixTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab auditLogs={auditLogs} auditLoading={auditLoading} onRefresh={fetchAuditLogs} />
          </TabsContent>
        </Tabs>
      </div>

      <EditRoleDialog
        profile={editModal}
        role={editRole}
        isMaster={isMaster}
        onRoleChange={setEditRole}
        onClose={() => setEditModal(null)}
        onSave={saveRole}
      />

      {isMaster && (
        <AddMemberDialog
          org={addMemberModal}
          email={addMemberEmail}
          adding={addingMember}
          onEmailChange={setAddMemberEmail}
          onClose={() => setAddMemberModal(null)}
          onSubmit={handleAddMember}
        />
      )}

      {isMaster && (
        <CreateUserDialog
          open={createUserModal}
          onOpenChange={setCreateUserModal}
          form={createUserForm}
          onFormChange={setCreateUserForm}
          orgs={orgs}
          creating={creatingUser}
          onSubmit={createUser}
        />
      )}
    </AppLayout>
  );
}
