import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Minister } from './entities/minister.entity.js';
import { CreateMinisterDto, UpdateMinisterDto, MinisterQueryDto } from './dto/minister.dto.js';

@Injectable()
export class MinistersService {
  private readonly logger = new Logger(MinistersService.name);

  constructor(
    @InjectRepository(Minister)
    private readonly ministerRepository: Repository<Minister>,
  ) {}

  async create(dto: CreateMinisterDto): Promise<Minister> {
    const minister = this.ministerRepository.create(dto);
    return this.ministerRepository.save(minister);
  }

  async findAll(query: MinisterQueryDto): Promise<{ data: Minister[]; total: number }> {
    const qb = this.ministerRepository.createQueryBuilder('minister');

    if (query.search) {
      qb.where(
        '(LOWER(minister.name) LIKE LOWER(:search) OR LOWER(minister.email) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('minister.name', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<Minister> {
    const minister = await this.ministerRepository.findOne({ where: { id } });
    if (!minister) {
      throw new NotFoundException(`Minister with ID "${id}" not found`);
    }
    return minister;
  }

  async findByIds(ids: string[]): Promise<Minister[]> {
    if (!ids || ids.length === 0) return [];
    return this.ministerRepository.createQueryBuilder('minister')
      .where('minister.id IN (:...ids)', { ids })
      .getMany();
  }

  async update(id: string, dto: UpdateMinisterDto): Promise<Minister> {
    const minister = await this.findOne(id);
    Object.assign(minister, dto);
    return this.ministerRepository.save(minister);
  }

  async remove(id: string): Promise<void> {
    const minister = await this.findOne(id);
    await this.ministerRepository.softRemove(minister);
  }
}
