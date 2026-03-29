import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { FormType } from '../entities/form-entry.entity.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class CreateFormEntryDto {
  @ApiProperty({ enum: FormType, example: FormType.NEW_COMERS, description: 'Type of form being submitted' })
  @IsEnum(FormType)
  @IsNotEmpty()
  type: FormType;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Additional form-specific data as key-value pairs',
    example: { department: 'Choir', availability: 'Sundays Only' },
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

export class UpdateFormEntryDto {
  @ApiPropertyOptional({ enum: FormType })
  @IsEnum(FormType)
  @IsOptional()
  type?: FormType;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  fullName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '08098765432' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Additional form-specific data as key-value pairs',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;
}

export class FormEntryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FormType, description: 'Filter by form type' })
  @IsEnum(FormType)
  @IsOptional()
  type?: FormType;

  @ApiPropertyOptional({ description: 'Filter by submitter email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Search in name' })
  @IsString()
  @IsOptional()
  search?: string;
}
