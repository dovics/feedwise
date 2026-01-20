import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * API 路由中间件包装器
 * 自动为所有 API 路由添加请求日志、错误日志和性能监控
 *
 * @param handler - API 路由处理函数
 * @param options - 配置选项
 *
 * @example
 * export const GET = withApiHandler(async (req) => {
 *   return NextResponse.json({ data: 'hello' });
 * });
 */
export function withApiHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options?: {
    logRequest?: boolean;
    logSuccess?: boolean;
    logError?: boolean;
    extractUserId?: (req: NextRequest) => string | Promise<string | undefined> | undefined;
  }
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const url = req.url;
    const method = req.method;
    let userId: string | undefined;

    try {
      // 尝试提取用户 ID
      if (options?.extractUserId) {
        userId = await options.extractUserId(req);
      }

      // 记录请求开始
      if (options?.logRequest !== false) {
        logger.logApiRequestStart(method, url, userId);
      }

      // 执行实际的处理器
      const response = await handler(req, context);

      // 记录成功
      if (options?.logSuccess !== false) {
        const duration = Date.now() - startTime;
        logger.logApiRequestSuccess(method, url, userId, duration, {
          statusCode: response.status,
        });
      }

      return response;
    } catch (error) {
      // 记录错误
      const duration = Date.now() - startTime;
      if (options?.logError !== false) {
        logger.logApiRequestError(method, url, error as Error, userId, duration);
      }

      // 如果错误已经是 NextResponse，直接返回
      if (error instanceof NextResponse) {
        return error;
      }

      // 否则返回通用错误响应
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}

/**
 * 带认证的 API 中间件
 * 自动处理 NextAuth 会话验证和日志记录
 *
 * @param handler - API 路由处理函数（接收 session 和 req）
 * @param options - 配置选项
 *
 * @example
 * export const POST = withAuthenticatedApiHandler(async (req, session) => {
 *   return NextResponse.json({ userId: session.user.id });
 * });
 */
export async function withAuthenticatedApiHandler(
  handler: (req: NextRequest, session: any, context?: any) => Promise<NextResponse>,
  options?: {
    logRequest?: boolean;
    logSuccess?: boolean;
    logError?: boolean;
  }
) {
  return withApiHandler(async (req: NextRequest, context?: any) => {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.logApiRequestError(
        req.method,
        req.url,
        new Error('Unauthorized'),
        undefined,
        Date.now() - (req as any)._startTime || 0
      );

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return handler(req, session, context);
  }, {
    ...options,
    extractUserId: (req) => {
      return (async () => {
        const { getServerSession } = await import("next-auth");
        const { authOptions } = await import("@/lib/auth");
        const session = await getServerSession(authOptions);
        return session?.user?.id;
      })();
    }
  });
}
