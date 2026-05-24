import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async createForUser(
    input: CreateNotificationInput,
    manager?: EntityManager,
  ): Promise<Notification> {
    const repo = manager
      ? manager.getRepository(Notification)
      : this.notificationsRepository;

    const notification = repo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
    });
    return repo.save(notification);
  }

  async findMine(user: User): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(user: User, id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId: user.id },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.notificationsRepository.update(id, { readAt: new Date() });
    return this.notificationsRepository.findOne({ where: { id } });
  }

  async markAllRead(user: User): Promise<void> {
    await this.notificationsRepository.update(
      { userId: user.id, readAt: null },
      { readAt: new Date() },
    );
  }
}
