import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List current customer favorites' })
  async findMine(@CurrentUser() user: User) {
    const favorites = await this.favoritesService.findMine(user);
    return { success: true, data: favorites };
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a product to favorites' })
  async add(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const favorite = await this.favoritesService.add(user, productId);
    return {
      success: true,
      message: 'Product added to favorites',
      data: favorite,
    };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from favorites' })
  async remove(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    await this.favoritesService.remove(user, productId);
    return { success: true, message: 'Product removed from favorites' };
  }
}
