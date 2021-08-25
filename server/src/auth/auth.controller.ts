import { Body, Controller, Get, Ip, Post, Req, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateUserDto } from 'src/users/dto/CreateUser.dto';
import { LoginDto } from 'src/users/dto/Login.dto';
import { UserDto } from 'src/users/dto/User.dto';
import { User } from 'src/users/entity/user.entity';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { RefreshRequest } from './dto/request-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from './interfaces/role';
import { AuthenticationPayload, GenericResponse } from './interfaces/token';
import { TokenService } from './tokens.service';


@Controller('auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly tokenService: TokenService
  ) {}

  // @UseGuards(LocalAuthGuard)
  // @Get('test')
  // async test(): Promise<any> {
  //   return this.authService.test();
  // }

  // @Get('test2')
  // async test2(): Promise<any> {
  //   const a = await this.authService.test();
  //   return a;
  // }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Body() loginDto: LoginDto): Promise<AuthenticationPayload> {
    const user = await this.authService.login(loginDto);
    if (!user) { return null; }
    const token = await this.tokenService.generateAccessToken(user)
    const refresh = await this.tokenService.generateRefreshToken(user, 60 * 60 * 24 * 30)
    const payload = this.buildResponsePayload(user, token, refresh)
    return payload;
  }

  @Post('register')
  @UseGuards(LocalAuthGuard)
  async register(@Body() createUserDto: CreateUserDto, @Ip() ip: string): Promise<AuthenticationPayload> {
    const user = await this.authService.register(createUserDto, ip);
    const token = await this.tokenService.generateAccessToken(user)
    const refresh = await this.tokenService.generateRefreshToken(user, 60 * 60 * 24 * 30)
    const payload = this.buildResponsePayload(user, token, refresh);
    return payload;
  }

  
  @Post('/refresh')
  public async refresh (@Body() body: RefreshRequest): Promise<AuthenticationPayload> {
    const { user, token } = await this.tokenService.createAccessTokenFromRefreshToken(body.refresh_token);
    const payload = this.buildResponsePayload(user, token);
    return payload;
  }

  @Get('/me')
  @Roles(Role.User)
  @UseGuards(JwtAuthGuard)
  public async getUser (@Req() request: { user: { id: string }}): Promise<GenericResponse<User>> {
    const userId = request.user.id

    const user = await this.usersService.findOne(userId)

    return {
      status: 'success',
      data: user,
    }
  }

  private buildResponsePayload (user: User, accessToken: string, refreshToken?: string): AuthenticationPayload {
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.passwd;
    delete userWithoutPassword.passwd2;
    return {
      user: userWithoutPassword as User,
      payload: {
        type: 'bearer',
        token: accessToken,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      }
    }
  }
}
  // @UseGuards(JwtAuthGuard)
  // @Roles(Role.Admin)
  // @Get('profile')
  // getProfile(@Request() req: { user: UserDto }): UserDto {
  //   return req.user;
  // }


// constructor(private readonly catsService: CatsService) {}

// @Post()
// @Roles(Role.Admin)
// async create(@Body() createCatDto: CreateCatDto) {
//   this.catsService.create(createCatDto);
// }

// @Get()
// async findAll(): Promise<Cat[]> {
//   return this.catsService.findAll();
// }

// @Get(':id')
// findOne(
//   @Param('id', new ParseIntPipe())
//   id: number,
// ) {
//   // get by ID logic
// }