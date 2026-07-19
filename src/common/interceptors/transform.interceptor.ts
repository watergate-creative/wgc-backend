import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto.js';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((res) => {
        if (res instanceof ApiResponse) {
          return res;
        }

        if (
          res &&
          typeof res === 'object' &&
          !Array.isArray(res) &&
          'data' in res &&
          ('currentPage' in res || 'totalRecords' in res || 'meta' in res)
        ) {
        
          const { data, ...paginationMeta } = res;
          const response = ApiResponse.ok(data) as any;
          response.pagination = paginationMeta;
          
          return response;
        }
        return ApiResponse.ok(res);
      }),
    );
  }
}