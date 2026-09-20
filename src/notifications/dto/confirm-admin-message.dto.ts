import { IsNotEmpty, IsUUID } from 'class-validator';

export class ConfirmAdminMessageDto {
  @IsUUID()
  @IsNotEmpty()
  previewId: string;
}
