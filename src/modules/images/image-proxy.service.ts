import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ProxiedImage } from './image-proxy.types';

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

@Injectable()
export class ImageProxyService {
  private readonly maxImageBytes = 8 * 1024 * 1024;

  async load(rawUrl: string): Promise<ProxiedImage> {
    try {
      const imageUrl = this.validateUrl(rawUrl);
      const upstream = await this.fetchWithSafeRedirects(imageUrl);
      if (!upstream.ok)
        throw new BadGatewayException(`Nguồn ảnh trả về ${upstream.status}`);
      const contentType = upstream.headers.get('content-type')?.split(';')[0];
      if (!contentType?.startsWith('image/'))
        throw new BadGatewayException('Nguồn không trả về định dạng ảnh');
      const declaredLength = Number(
        upstream.headers.get('content-length') ?? 0,
      );
      if (declaredLength > this.maxImageBytes)
        throw new PayloadTooLargeException('Ảnh vượt quá giới hạn 8 MB');
      const body = Buffer.from(await upstream.arrayBuffer());
      if (body.byteLength > this.maxImageBytes)
        throw new PayloadTooLargeException('Ảnh vượt quá giới hạn 8 MB');
      return {
        body,
        contentType,
        cacheControl: 'public, max-age=21600, stale-while-revalidate=86400',
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException ||
        error instanceof PayloadTooLargeException
      )
        throw error;
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Không thể tải ảnh nguồn',
      );
    }
  }

  private async fetchWithSafeRedirects(
    initialUrl: URL,
  ): Promise<FetchResponse> {
    try {
      let currentUrl = initialUrl;
      for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(12_000),
          headers: {
            Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
            Referer: this.refererFor(currentUrl.hostname),
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
          },
        });
        if (![301, 302, 303, 307, 308].includes(response.status))
          return response;
        const location = response.headers.get('location');
        if (!location)
          throw new BadGatewayException('Ảnh chuyển hướng không hợp lệ');
        currentUrl = this.validateUrl(new URL(location, currentUrl).toString());
      }
      throw new BadGatewayException('Ảnh chuyển hướng quá nhiều lần');
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      )
        throw error;
      throw new BadGatewayException(
        error instanceof Error ? error.message : 'Không thể kết nối nguồn ảnh',
      );
    }
  }

  private validateUrl(rawUrl: string): URL {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== 'https:')
        throw new BadRequestException('Ảnh phải sử dụng HTTPS');
      const hostname = parsed.hostname.toLowerCase();
      if (!this.isAllowedHostname(hostname))
        throw new BadRequestException('Tên miền ảnh không được hỗ trợ');
      return parsed;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('URL ảnh không hợp lệ');
    }
  }

  private isAllowedHostname(hostname: string): boolean {
    try {
      return (
        hostname.endsWith('.vnecdn.net') ||
        hostname === 'vnecdn.net' ||
        hostname.endsWith('.thanhnien.vn') ||
        hostname === 'thanhnien.vn'
      );
    } catch {
      return false;
    }
  }

  private refererFor(hostname: string): string {
    try {
      return hostname.includes('thanhnien')
        ? 'https://thanhnien.vn/'
        : 'https://vnexpress.net/';
    } catch {
      return 'https://vnexpress.net/';
    }
  }
}
