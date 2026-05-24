import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Categories')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'جلب جميع التصنيفات الرئيسية مع الفرعية' })
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return { success: true, data: categories };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'جلب تصنيف بالمعرف' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoriesService.findOne(id);
    return { success: true, data: category };
  }
}
