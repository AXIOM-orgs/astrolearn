import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Baca file test.txt dari root directory
        const filePath = join(process.cwd(), 'test.txt');
        const content = readFileSync(filePath, 'utf-8');

        return NextResponse.json({
            status: 'success',
            message: 'Testing route berhasil',
            testContent: content.trim(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            {
                status: 'error',
                message: 'Gagal membaca file test.txt',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
