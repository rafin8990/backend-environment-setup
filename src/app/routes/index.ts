import express from 'express';
import { MenuItemsRoute } from '../modules/menuItems/menuItems.route';
import { TypeRoute } from '../modules/type/type.route';
import { CategoryRoutes } from '../modules/categories/categories.route';
import { TagRoutes } from '../modules/tags/tags.route';
import { RecipeRoute } from '../modules/Recipes/recipes.route';
import { RecipeIngrediantRoute } from '../modules/recipeIngrediants/recipeIngrediant.route';
import { SuppliersRoute } from '../modules/suppliers/suppliers.route';
import { LocationRoute } from '../modules/location/location.route';
import { ItemRoute } from '../modules/items/items.route';
import { StockRoute } from '../modules/stocks/stocks.route';
import { LocationStockRoute } from '../modules/locationStocks/locationStocks.route';
import StockTransferRoute from '../modules/stockTransfers/stockTransfers.route';
import { StockMovementRoute } from '../modules/stockMovements/stockMovements.route';
import { LowStockAlertsRoute } from '../modules/LowStockAlerts/lowStockAlerts.route';
import { OrdersRoute } from '../modules/orders/orders.route';
import { RequisitionRoute } from '../modules/requisition/requisition.route';
import PurchaseOrderRoutes from '../modules/purchaseOrders/purchaseOrders.routes';
import { GRNRoutes } from '../modules/grns/grns.routes';
import { PurchaseEntryRoutes } from '../modules/purchaseEntries/purchaseEntries.routes';
import { OrganizationsRoutes } from '../modules/organization/organization.route';
import { PermissionRoutes } from '../modules/permission/permission.route';
import { RoleRoutes } from '../modules/role/role.route';
import { UserRoutes } from '../modules/users/users.route';
import { AuthRoutes } from '../modules/auth/auth.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/navigation-menu-items',
    routes: MenuItemsRoute,
  },
  {
    path: '/types',
    routes: TypeRoute,
  },
  {
    path: '/categories',
    routes: CategoryRoutes,
  },
  {
    path: '/tags',
    routes: TagRoutes,
  },
  {
    path: '/recipes',
    routes: RecipeRoute,
  },
  {
    path: '/recipe-ingredients',
    routes: RecipeIngrediantRoute,
  },
  {
    path: '/suppliers',
    routes: SuppliersRoute,
  },
  {
    path: '/locations',
    routes: LocationRoute,
  },
  {
    path: '/items',
    routes: ItemRoute,
  },
  {
    path: '/stocks',
    routes: StockRoute,
  },
  {
    path: '/location-stocks',
    routes: LocationStockRoute,
  },
  {
    path: '/stock-transfers',
    routes: StockTransferRoute,
  },
  {
    path: '/stock-movements',
    routes: StockMovementRoute,
  },
  {
    path: '/low-stock-alerts',
    routes: LowStockAlertsRoute,
  },
  {
    path: '/orders',
    routes: OrdersRoute,
  },
  {
    path: '/requisitions',
    routes: RequisitionRoute,
  },
  {
    path: '/purchase-orders',
    routes: PurchaseOrderRoutes,
  },
  {
    path: '/grns',
    routes: GRNRoutes,
  },
  {
    path: '/purchase-entries',
    routes: PurchaseEntryRoutes,
  },
  {
    path: '/organization',
    routes: OrganizationsRoutes,
  },
  {
    path: '/permission',
    routes: PermissionRoutes,
  },
  {
    path: '/role',
    routes: RoleRoutes,
  },
  {
    path: '/users',
    routes: UserRoutes,
  },
  {
    path: '/auth',
    routes: AuthRoutes
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.routes));
export default router;
