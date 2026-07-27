import type { Metadata } from "next";

import { CollaborationSubnav } from "@/components/collaboration/collaboration-subnav";
import { KnowledgeManager } from "@/components/collaboration/knowledge-manager";
import { PageHeader } from "@/components/layout/page-header";
import { COLLAB_UI } from "@/lib/collaboration/constants";
import { isOrgAdmin } from "@/lib/collaboration/permissions";
import {
  listKnowledgeArticles,
  listKnowledgeCategories,
} from "@/lib/collaboration/queries";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

export const metadata: Metadata = { title: COLLAB_UI.knowledgeTitle };

export default async function KnowledgePage() {
  const context = await getActiveOrganization();
  if (!context) return null;

  const [articles, categories] = await Promise.all([
    listKnowledgeArticles(context.organization.id),
    listKnowledgeCategories(context.organization.id),
  ]);

  return (
    <div>
      <PageHeader
        title={COLLAB_UI.knowledgeTitle}
        description="Internal documentation with categories, search, favorites, and version history."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: COLLAB_UI.hubTitle, href: "/collaboration" },
          { label: COLLAB_UI.knowledgeTitle },
        ]}
      />
      <CollaborationSubnav />
      <KnowledgeManager
        articles={articles}
        categories={categories}
        canManageCategories={isOrgAdmin(context.membership.role)}
      />
    </div>
  );
}
