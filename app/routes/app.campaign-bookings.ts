import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import CampaignBookingsPage from "app/components/CampaignBookingsPage";
import { authenticate } from "app/shopify.server";

const CAMPAIGN_PAGE_TITLE = "Campaign Booking";
const CAMPAIGN_PAGE_HANDLE = "campaign-booking";
const CAMPAIGN_MENU_ID = process.env.CAMPAIGN_MENU_ID;

type AdminGraphQLClient = {
  graphql: (query: string, options?: Record<string, unknown>) => Promise<Response>;
};

type CampaignPage = {
  id: string;
  title: string;
  handle: string;
  isPublished: boolean;
};

type MenuItemNode = {
  id?: string;
  title: string;
  type: string;
  url?: string | null;
  resourceId?: string | null;
  tags?: string[] | null;
  items?: MenuItemNode[];
};

type CampaignResources = {
  page: CampaignPage | null;
  menu: {
    id: string;
    title: string;
    handle: string;
    items: MenuItemNode[];
  } | null;
};

function normalizeValue(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function getNestedMenuFields(depth: number): string {
  if (depth <= 0) {
    return "";
  }

  return `
    items {
      id
      title
      type
      url
      resourceId
      tags
      ${getNestedMenuFields(depth - 1)}
    }
  `;
}

async function adminGraphql<TData>(
  admin: AdminGraphQLClient,
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  const response = await admin.graphql(query, variables ? { variables } : undefined);
  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Shopify Admin GraphQL request failed.");
  }

  return json.data as TData;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return null;
}

async function getCampaignResources(admin: AdminGraphQLClient): Promise<CampaignResources> {
  const data = await adminGraphql<{
    pagesByTitle: { nodes: CampaignPage[] };
    pagesByHandle: { nodes: CampaignPage[] };
    menu: {
      id: string;
      title: string;
      handle: string;
      items: MenuItemNode[];
    } | null;
  }>(
    admin,
    `#graphql
      query CampaignResources($menuId: ID!, $pageTitleQuery: String!, $pageHandleQuery: String!) {
        pagesByTitle: pages(first: 10, query: $pageTitleQuery) {
          nodes {
            id
            title
            handle
            isPublished
          }
        }
        pagesByHandle: pages(first: 10, query: $pageHandleQuery) {
          nodes {
            id
            title
            handle
            isPublished
          }
        }
        menu(id: $menuId) {
          id
          title
          handle
          items {
            id
            title
            type
            url
            resourceId
            tags
            ${getNestedMenuFields(4)}
          }
        }
      }
    `,
    {
      menuId: CAMPAIGN_MENU_ID,
      pageTitleQuery: `title:'${CAMPAIGN_PAGE_TITLE}'`,
      pageHandleQuery: `handle:${CAMPAIGN_PAGE_HANDLE}`,
    },
  );

  const page =
    data.pagesByTitle.nodes.find((item) => normalizeValue(item.title) === normalizeValue(CAMPAIGN_PAGE_TITLE)) ||
    data.pagesByHandle.nodes.find((item) => normalizeValue(item.handle) === CAMPAIGN_PAGE_HANDLE) ||
    null;

  return {
    page,
    menu: data.menu,
  };
}

function isTargetMenuItem(item: MenuItemNode, page: CampaignPage | null) {
  const normalizedTitle = normalizeValue(item.title);
  const matchesByTitle = normalizedTitle === normalizeValue(CAMPAIGN_PAGE_TITLE);
  const matchesByPage = Boolean(page?.id && item.resourceId === page.id);

  return matchesByTitle || matchesByPage;
}

function menuContainsTarget(items: MenuItemNode[], page: CampaignPage | null): boolean {
  return items.some((item) => {
    if (isTargetMenuItem(item, page)) {
      return true;
    }

    return menuContainsTarget(item.items || [], page);
  });
}

function buildMenuUpdateItems(items: MenuItemNode[]): MenuItemNode[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    url: item.url || undefined,
    resourceId: item.resourceId || undefined,
    tags: item.tags || undefined,
    items: buildMenuUpdateItems(item.items || []),
  }));
}

function removeTargetMenuItems(items: MenuItemNode[], page: CampaignPage | null): MenuItemNode[] {
  return items
    .filter((item) => !isTargetMenuItem(item, page))
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      url: item.url || undefined,
      resourceId: item.resourceId || undefined,
      tags: item.tags || undefined,
      items: removeTargetMenuItems(item.items || [], page),
    }));
}

function buildCampaignMenuItem(page: CampaignPage): MenuItemNode {
  return {
    title: CAMPAIGN_PAGE_TITLE,
    type: "PAGE",
    resourceId: page.id,
    url: `/pages/${page.handle || CAMPAIGN_PAGE_HANDLE}`,
    items: [],
  };
}

async function updateCampaignPageVisibility(admin: AdminGraphQLClient, pageId: string, isPublished: boolean) {
  const data = await adminGraphql<{
    pageUpdate: {
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation UpdateCampaignPageVisibility($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          userErrors {
            message
          }
        }
      }
    `,
    {
      id: pageId,
      page: {
        isPublished,
      },
    },
  );

  const userErrors = data.pageUpdate.userErrors || [];

  if (userErrors.length > 0) {
    throw new Error(userErrors[0]?.message || "Failed to update the Campaign Booking page.");
  }
}

async function updateCampaignMenuVisibility(
  admin: AdminGraphQLClient,
  menu: NonNullable<CampaignResources["menu"]>,
  page: CampaignPage,
  shouldShow: boolean,
) {
  const hasTargetItem = menuContainsTarget(menu.items || [], page);
  let nextItems = buildMenuUpdateItems(menu.items || []);

  if (shouldShow && !hasTargetItem) {
    nextItems = [...nextItems, buildCampaignMenuItem(page)];
  }

  if (!shouldShow && hasTargetItem) {
    nextItems = removeTargetMenuItems(menu.items || [], page);
  }

  const data = await adminGraphql<{
    menuUpdate: {
      userErrors: Array<{ message: string }>;
    };
  }>(
    admin,
    `#graphql
      mutation UpdateCampaignMenu($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
          userErrors {
            message
          }
        }
      }
    `,
    {
      id: menu.id,
      title: menu.title,
      handle: menu.handle,
      items: nextItems,
    },
  );

  const userErrors = data.menuUpdate.userErrors || [];

  if (userErrors.length > 0) {
    throw new Error(userErrors[0]?.message || "Failed to update the Campaign Booking menu item.");
  }
}

async function getCampaignVisibility(admin: AdminGraphQLClient) {
  const { page, menu } = await getCampaignResources(admin);
  const isPagePublished = Boolean(page?.isPublished);
  const isMenuVisible = Boolean(page && menu && menuContainsTarget(menu.items || [], page));

  return {
    pageFound: Boolean(page),
    menuFound: Boolean(menu),
    isPagePublished,
    isMenuVisible,
    showCampaignPage: isPagePublished && isMenuVisible,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  return getCampaignVisibility(admin as AdminGraphQLClient);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("actionType") !== "UPDATE_CAMPAIGN_VISIBILITY") {
    const currentState = await getCampaignVisibility(admin as AdminGraphQLClient);
    return {
      success: false,
      message: "Invalid action.",
      ...currentState,
    };
  }

  const shouldShow = formData.get("showCampaignPage") === "true";

  try {
    const { page, menu } = await getCampaignResources(admin as AdminGraphQLClient);

    if (!page) {
      return {
        success: false,
        message: `The Shopify page "${CAMPAIGN_PAGE_TITLE}" was not found.`,
        ...(await getCampaignVisibility(admin as AdminGraphQLClient)),
      };
    }

    if (!menu) {
      return {
        success: false,
        message: `The Shopify menu ${CAMPAIGN_MENU_ID} was not found.`,
        ...(await getCampaignVisibility(admin as AdminGraphQLClient)),
      };
    }

    await updateCampaignPageVisibility(admin as AdminGraphQLClient, page.id, shouldShow);
    await updateCampaignMenuVisibility(admin as AdminGraphQLClient, menu, page, shouldShow);

    return {
      success: true,
      message: `Campaign Booking page and menu are now ${shouldShow ? "visible" : "hidden"}.`,
      ...(await getCampaignVisibility(admin as AdminGraphQLClient)),
    };
  } catch (error: unknown) {
    return {
      success: false,
      message:
        getErrorMessage(error) ||
        "Failed to update Campaign Booking page and menu visibility. Verify the app scopes include content and navigation access.",
      ...(await getCampaignVisibility(admin as AdminGraphQLClient)),
    };
  }
};

export default CampaignBookingsPage;
