export class PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;

  constructor(page: number, limit: number, totalItems: number) {
    this.page = page;
    this.limit = limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPreviousPage = page > 1;
  }
}

export class ApiResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T;
  readonly meta?: PaginationMeta;
  readonly timestamp: string;

  constructor(data: T, message = 'Success', meta?: PaginationMeta) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data: T, message = 'Success', meta?: PaginationMeta): ApiResponse<T> {
    return new ApiResponse(data, message, meta);
  }

  static paginated<T>(
    data: T[],
    totalItems: number,
    page: number,
    limit: number,
    message = 'Success',
  ): ApiResponse<T[]> {
    const meta = new PaginationMeta(page, limit, totalItems);
    return new ApiResponse(data, message, meta);
  }
}
