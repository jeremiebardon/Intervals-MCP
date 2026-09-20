import { Controller, Post, Get, Delete, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpTransportService } from './mcp-transport.service';

const METHOD_NOT_ALLOWED_BODY = JSON.stringify({
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
});

@Controller('mcp')
export class McpController {
  constructor(private readonly transportService: McpTransportService) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.transportService.handleRequest(req, res, req.body);
  }

  // Stateless mode creates a new transport per POST, so there is never a
  // standing session for a GET stream or a DELETE to terminate.
  @Get()
  handleGet(@Res() res: Response): void {
    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(METHOD_NOT_ALLOWED_BODY);
  }

  @Delete()
  handleDelete(@Res() res: Response): void {
    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(METHOD_NOT_ALLOWED_BODY);
  }
}
