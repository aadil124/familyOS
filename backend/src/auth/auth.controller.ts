import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginResponseDto, RegisterResponseDto, TokenPairResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUser as CurrentUserInterface } from './interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('v1/auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User successfully registered.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiConflictResponse({ description: 'Email already registered.' })
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials' })
  @ApiOkResponse({ description: 'User successfully logged in.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  @ApiOkResponse({ description: 'Token rotated successfully.', type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  async refresh(@Body() refreshDto: RefreshDto): Promise<TokenPairResponseDto> {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out current session' })
  @ApiOkResponse({ description: 'Successfully logged out.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access.' })
  async logout(@CurrentUser() user: CurrentUserInterface): Promise<void> {
    await this.authService.logout(user.userId);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Returns user profile details.', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access.' })
  async me(@CurrentUser() user: CurrentUserInterface): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.userId);
  }
}
