import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsObject,
  IsEmail,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class FormFieldDto {
  @ApiProperty({ example: 'fullName' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: 'text',
    enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'date', 'number'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: 'Enter your full name' })
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional({ example: ['Male', 'Female'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  validationRegex?: string;
}

export class CreateFormTemplateDto {
  @ApiProperty({ example: 'Volunteer Form' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ example: 'Sign up to volunteer at WaterGate Church' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [FormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateFormTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [FormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  @IsOptional()
  fields?: FormFieldDto[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SubmitFormDto {
  @ApiProperty({
    description: 'Key-value pairs matching template field names',
    example: { fullName: 'John Doe', email: 'john@example.com' },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  submitterName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  submitterEmail?: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsString()
  @IsOptional()
  submitterPhone?: string;
}

export class FormQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class SubmissionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by submitter email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Search by submitter name' })
  @IsString()
  @IsOptional()
  search?: string;
}
