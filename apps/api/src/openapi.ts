const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonResponse = (description: string, schema: object, example?: object) => ({
  description,
  content: { 'application/json': { schema, ...(example ? { example } : {}) } }
});
const errorResponse = (description: string, code: string, message: string) =>
  jsonResponse(description, ref('ErrorResponse'), { error: { code, message } });
const unauthorized = errorResponse('未登录或 Bearer token 无效', 'UNAUTHORIZED', '请先登录');
const badInput = errorResponse('请求参数不合法', 'INVALID_INPUT', '请求参数不合法');
const notFound = errorResponse('资源不存在', 'NOT_FOUND', '资源不存在');
const serverError = errorResponse('服务器错误', 'INTERNAL_ERROR', '服务器暂时无法处理请求');
const bearer = [{ bearerAuth: [] }];
const idParameter = (name: string) => ({
  name, in: 'path', required: true, description: '正整数 ID',
  schema: { type: 'integer', minimum: 1 }, example: 1
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: '拾间电商 API',
    version: '1.1.0',
    description: '本地演示商城的 REST API。金额统一以整数分表示；下单仅模拟支付。可调用注册或登录接口取得 token，再点击右上角 Authorize 输入 token（无需手动添加 Bearer 前缀）。'
  },
  servers: [{ url: '/', description: '当前服务' }],
  tags: [
    { name: '系统', description: '服务状态' },
    { name: '认证', description: '账号注册、登录与当前用户' },
    { name: '商品', description: '浏览和筛选商品' },
    { name: '购物车', description: '当前用户的购物车' },
    { name: '订单', description: '模拟下单和本人订单查询' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['系统'], summary: '健康检查', operationId: 'getHealth',
        responses: { 200: jsonResponse('API 服务运行中', ref('HealthResponse'), { status: 'ok' }), default: serverError }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['认证'], summary: '注册账号', operationId: 'register',
        description: '创建账号并返回有效期为 7 天的 JWT。邮箱不区分大小写。',
        requestBody: { required: true, content: { 'application/json': { schema: ref('RegisterRequest'), example: { name: '小明', email: 'new@example.com', password: 'Password123!' } } } },
        responses: {
          201: jsonResponse('注册成功', ref('LoginResponse')),
          400: errorResponse('注册信息不合法', 'INVALID_EMAIL', '请输入有效的邮箱地址'),
          409: errorResponse('邮箱已被注册', 'EMAIL_EXISTS', '该邮箱已注册，请直接登录'),
          default: serverError
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['认证'], summary: '邮箱密码登录', operationId: 'login',
        description: '演示账号 demo@example.com / Demo123456!。成功后返回有效期为 7 天的 JWT。',
        requestBody: { required: true, content: { 'application/json': { schema: ref('LoginRequest'), example: { email: 'demo@example.com', password: 'Demo123456!' } } } },
        responses: {
          200: jsonResponse('登录成功', ref('LoginResponse')),
          400: errorResponse('邮箱或密码缺失', 'INVALID_INPUT', '请输入邮箱和密码'),
          401: errorResponse('邮箱或密码错误', 'INVALID_CREDENTIALS', '邮箱或密码错误'),
          default: serverError
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['认证'], summary: '获取当前用户', operationId: 'getCurrentUser', security: bearer,
        responses: { 200: jsonResponse('当前用户', ref('UserResponse')), 401: unauthorized, default: serverError }
      }
    },
    '/api/products': {
      get: {
        tags: ['商品'], summary: '商品列表', operationId: 'listProducts',
        description: '仅返回上架商品，按 ID 升序。q 按名称模糊搜索，category 按分类精确筛选。',
        parameters: [
          { name: 'q', in: 'query', description: '商品名称关键词，最多 100 字符', schema: { type: 'string', maxLength: 100 }, example: '陶瓷' },
          { name: 'category', in: 'query', description: '商品分类，最多 80 字符', schema: { type: 'string', maxLength: 80 }, example: '居家' }
        ],
        responses: { 200: jsonResponse('商品列表', ref('ProductListResponse')), 400: badInput, default: serverError }
      }
    },
    '/api/products/{id}': {
      get: {
        tags: ['商品'], summary: '商品详情', operationId: 'getProduct', parameters: [idParameter('id')],
        responses: { 200: jsonResponse('商品详情', ref('ProductResponse')), 400: errorResponse('ID 不合法', 'INVALID_ID', '无效的 ID'), 404: errorResponse('商品不存在或未上架', 'NOT_FOUND', '商品不存在'), default: serverError }
      }
    },
    '/api/cart': {
      get: {
        tags: ['购物车'], summary: '查询购物车', operationId: 'getCart', security: bearer,
        responses: { 200: jsonResponse('购物车商品和合计金额', ref('CartResponse')), 401: unauthorized, default: serverError }
      }
    },
    '/api/cart/items': {
      post: {
        tags: ['购物车'], summary: '加入购物车', operationId: 'addCartItem', security: bearer,
        description: '同一商品再次加入时，数量累加；合计数量不能超过 99 或当前库存。',
        requestBody: { required: true, content: { 'application/json': { schema: ref('AddCartItemRequest'), example: { productId: 1, quantity: 2 } } } },
        responses: {
          201: jsonResponse('加入后的商品数量', ref('CartMutationResponse'), { productId: 1, quantity: 2 }),
          400: errorResponse('商品 ID 或数量不合法', 'INVALID_QUANTITY', '数量应为 1 至 99 的整数'),
          401: unauthorized, 404: errorResponse('商品不存在', 'NOT_FOUND', '商品不存在'),
          409: errorResponse('库存不足或购买数量过多', 'OUT_OF_STOCK', '库存不足或购买数量过多'), default: serverError
        }
      }
    },
    '/api/cart/items/{productId}': {
      patch: {
        tags: ['购物车'], summary: '修改购物车商品数量', operationId: 'updateCartItem', security: bearer,
        parameters: [idParameter('productId')],
        requestBody: { required: true, content: { 'application/json': { schema: ref('QuantityRequest'), example: { quantity: 3 } } } },
        responses: {
          200: jsonResponse('修改后的数量', ref('CartMutationResponse'), { productId: 1, quantity: 3 }),
          400: errorResponse('商品 ID 或数量不合法', 'INVALID_QUANTITY', '数量应为 1 至 99 的整数'),
          401: unauthorized, 404: errorResponse('商品不存在或不在购物车', 'NOT_FOUND', '购物车中没有此商品'),
          409: errorResponse('库存不足', 'OUT_OF_STOCK', '库存不足'), default: serverError
        }
      },
      delete: {
        tags: ['购物车'], summary: '移除购物车商品', operationId: 'removeCartItem', security: bearer,
        description: '商品不在购物车时也返回 204。', parameters: [idParameter('productId')],
        responses: { 204: { description: '移除成功，无响应体' }, 400: errorResponse('商品 ID 不合法', 'INVALID_ID', '无效的 ID'), 401: unauthorized, default: serverError }
      }
    },
    '/api/orders': {
      post: {
        tags: ['订单'], summary: '根据购物车创建订单', operationId: 'createOrder', security: bearer,
        description: '无需请求体。下单时在数据库事务中重新检查库存、保存成交价快照、扣减库存并清空购物车。支付状态固定为 paid_demo；不发生真实扣款。',
        responses: {
          201: jsonResponse('创建的订单摘要', ref('CreatedOrderResponse'), { order: { id: 1, totalCents: 17800, status: 'paid_demo' } }),
          400: errorResponse('购物车为空', 'EMPTY_CART', '购物车是空的'), 401: unauthorized,
          409: errorResponse('某商品库存不足或下架', 'OUT_OF_STOCK', '云朵陶瓷杯 库存不足'), default: serverError
        }
      },
      get: {
        tags: ['订单'], summary: '本人订单列表', operationId: 'listOrders', security: bearer,
        responses: { 200: jsonResponse('按时间倒序排列的订单摘要', ref('OrderListResponse')), 401: unauthorized, default: serverError }
      }
    },
    '/api/orders/{id}': {
      get: {
        tags: ['订单'], summary: '本人订单详情', operationId: 'getOrder', security: bearer,
        description: '非本人订单与不存在的订单均返回 404。', parameters: [idParameter('id')],
        responses: { 200: jsonResponse('订单和商品明细', ref('OrderDetailResponse')), 400: errorResponse('订单 ID 不合法', 'INVALID_ID', '无效的 ID'), 401: unauthorized, 404: errorResponse('订单不存在或不属于当前用户', 'NOT_FOUND', '订单不存在'), default: serverError }
      }
    }
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: '填写注册或登录接口返回的 token，Swagger UI 会自动加上 Bearer 前缀。' } },
    schemas: {
      HealthResponse: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } },
      ErrorResponse: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string', example: 'NOT_FOUND' }, message: { type: 'string', example: '商品不存在' } } } } },
      User: { type: 'object', required: ['id', 'email', 'name'], properties: { id: { type: 'integer', example: 1 }, email: { type: 'string', format: 'email', example: 'demo@example.com' }, name: { type: 'string', example: '演示用户' } } },
      UserResponse: { type: 'object', required: ['user'], properties: { user: ref('User') } },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'demo@example.com' }, password: { type: 'string', format: 'password', example: 'Demo123456!' } } },
      RegisterRequest: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', minLength: 1, maxLength: 100, example: '小明' }, email: { type: 'string', format: 'email', maxLength: 254, example: 'new@example.com' }, password: { type: 'string', format: 'password', minLength: 8, description: '8 至 72 字节', example: 'Password123!' } } },
      LoginResponse: { type: 'object', required: ['token', 'user'], properties: { token: { type: 'string', description: '7 天有效的 JWT', example: 'eyJhbGciOiJIUzI1NiIs...' }, user: ref('User') } },
      Product: { type: 'object', required: ['id', 'name', 'description', 'category', 'priceCents', 'stock', 'imagePath'], properties: { id: { type: 'integer', example: 1 }, name: { type: 'string', example: '云朵陶瓷杯' }, description: { type: 'string', example: '一只适合慢慢喝咖啡的手作质感陶瓷杯。' }, category: { type: 'string', example: '居家' }, priceCents: { type: 'integer', minimum: 0, description: '人民币分', example: 8900 }, stock: { type: 'integer', minimum: 0, example: 25 }, imagePath: { type: 'string', example: '/images/cup.svg' } } },
      ProductResponse: { type: 'object', required: ['product'], properties: { product: ref('Product') } },
      ProductListResponse: { type: 'object', required: ['products'], properties: { products: { type: 'array', items: ref('Product') } } },
      CartItem: { type: 'object', required: ['productId', 'name', 'priceCents', 'quantity', 'stock', 'imagePath'], properties: { productId: { type: 'integer', example: 1 }, name: { type: 'string', example: '云朵陶瓷杯' }, priceCents: { type: 'integer', example: 8900 }, quantity: { type: 'integer', example: 2 }, stock: { type: 'integer', example: 25 }, imagePath: { type: 'string', example: '/images/cup.svg' } } },
      CartResponse: { type: 'object', required: ['items', 'totalCents'], properties: { items: { type: 'array', items: ref('CartItem') }, totalCents: { type: 'integer', description: '购物车商品金额，人民币分', example: 17800 } } },
      AddCartItemRequest: { type: 'object', required: ['productId', 'quantity'], properties: { productId: { type: 'integer', minimum: 1, example: 1 }, quantity: { type: 'integer', minimum: 1, maximum: 99, example: 2 } } },
      QuantityRequest: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1, maximum: 99, example: 3 } } },
      CartMutationResponse: { type: 'object', required: ['productId', 'quantity'], properties: { productId: { type: 'integer', example: 1 }, quantity: { type: 'integer', example: 2 } } },
      OrderSummary: { type: 'object', required: ['id', 'totalCents', 'status', 'createdAt'], properties: { id: { type: 'integer', example: 1 }, totalCents: { type: 'integer', description: '订单成交总额，人民币分', example: 17800 }, status: { type: 'string', enum: ['paid_demo'], example: 'paid_demo' }, createdAt: { type: 'string', format: 'date-time', example: '2026-10-14T03:00:00.000Z' } } },
      CreatedOrder: { type: 'object', required: ['id', 'totalCents', 'status'], properties: { id: { type: 'integer', example: 1 }, totalCents: { type: 'integer', example: 17800 }, status: { type: 'string', enum: ['paid_demo'] } } },
      CreatedOrderResponse: { type: 'object', required: ['order'], properties: { order: ref('CreatedOrder') } },
      OrderListResponse: { type: 'object', required: ['orders'], properties: { orders: { type: 'array', items: ref('OrderSummary') } } },
      OrderItem: { type: 'object', required: ['productId', 'name', 'priceCents', 'quantity'], properties: { productId: { type: 'integer', example: 1 }, name: { type: 'string', description: '下单时的商品名称快照', example: '云朵陶瓷杯' }, priceCents: { type: 'integer', description: '下单时的单价快照，人民币分', example: 8900 }, quantity: { type: 'integer', example: 2 } } },
      OrderDetail: { allOf: [ref('OrderSummary'), { type: 'object', required: ['items'], properties: { items: { type: 'array', items: ref('OrderItem') } } }] },
      OrderDetailResponse: { type: 'object', required: ['order'], properties: { order: ref('OrderDetail') } }
    }
  }
};
