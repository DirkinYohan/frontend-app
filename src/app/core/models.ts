export type Role = 'ADMINISTRADOR' | 'OPERADOR';

export interface User {
  id: string;
  storeId: string;
  role: Role;
  firstName: string;
  lastName: string;
  identification: string;
  email: string;
  active: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  code: string;
  description: string | null;
  imageIds: string[];
  purchasePrice: string;
  salePrice: string;
  stockCurrent: number;
  stockMinimum: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productPrimaryImageId: string | null;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  total: string;
  totalProfit: string | null;
  createdAt: string;
  operator: User;
  items: SaleItem[];
}

export interface SaleCreatePayload {
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  items: Array<{ productId: string; quantity: number }>;
}

export type TipoMovimiento = 'ENTRY' | 'EXIT' | 'ADJUSTMENT' | 'SALE';

export interface MovimientoInventario {
  id: string;
  movementType: TipoMovimiento;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  user: User;
  observation: string | null;
  createdAt: string;
}

export interface DashboardSaleSummary {
  id: string;
  saleNumber: string;
  total: string;
  createdAt: string;
  operatorName: string;
}

export interface DashboardTopProduct {
  productId: string;
  name: string;
  code: string;
  unitsSold: number;
}

export interface DashboardDailySalesPoint {
  date: string;
  total: string;
}

export interface Dashboard {
  totalProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalOperators: number | null;
  totalSales: string;
  totalSalesCount: number | null;
  totalSalesLast30Days: string | null;
  totalSalesCountLast30Days: number | null;
  totalProfit: string | null;
  recentSales: DashboardSaleSummary[];
  topProducts: DashboardTopProduct[];
  dailySales: DashboardDailySalesPoint[];
}

export interface ReportDailyPoint {
  date: string;
  total: string;
  productPrimaryImageId: string | null;
  operatorName: string | null;
}

export interface ReportMonthlyPoint {
  month: string;
  total: string;
}

export interface ReportTopProduct {
  productId: string;
  productPrimaryImageId: string | null;
  code: string;
  name: string;
  unitsSold: number;
}

export interface ReportLowStockProduct {
  productId: string;
  productPrimaryImageId: string | null;
  code: string;
  name: string;
  stockCurrent: number;
  stockMinimum: number;
}

export interface Report {
  from: string;
  to: string;
  totalSales: string;
  totalProfit: string;
  totalSalesCount: number;
  totalProductsSold: number;
  dailySales: ReportDailyPoint[];
  monthlySales: ReportMonthlyPoint[];
  topProducts: ReportTopProduct[];
  lowStockProducts: ReportLowStockProduct[];
}
