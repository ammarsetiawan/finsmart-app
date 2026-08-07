import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance App API',
      version: '1.0.0',
      description: 'REST API untuk aplikasi manajemen keuangan generasi sandwich',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token dari Supabase Auth. Login dulu, ambil access_token, paste di sini.',
        },
      },
      schemas: {
        Transaction: {
          type: 'object',
          properties: {
            id:               { type: 'string', example: 'cuid2here' },
            user_id:          { type: 'string' },
            category_id:      { type: 'string', nullable: true },
            type:             { type: 'string', enum: ['income', 'expense'] },
            allocation_type:  { type: 'string', enum: ['pribadi', 'keluarga', 'tabungan'] },
            amount:           { type: 'number', example: 150000 },
            context_note:     { type: 'string', nullable: true, example: 'Bayar obat Bapak' },
            is_salary_split:  { type: 'boolean' },
            transaction_date: { type: 'string', format: 'date', example: '2025-01-15' },
            created_at:       { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id:              { type: 'string' },
            name:            { type: 'string', example: 'Makan & Minum' },
            allocation_type: { type: 'string', enum: ['pribadi', 'keluarga', 'tabungan'] },
            color:           { type: 'string', example: '#f97316' },
            icon:            { type: 'string', example: 'utensils' },
            is_salary:       { type: 'boolean' },
            is_default:      { type: 'boolean' },
          },
        },
        Budget: {
          type: 'object',
          properties: {
            id:           { type: 'string' },
            category_id:  { type: 'string' },
            limit_amount: { type: 'number', example: 500000 },
            period_month: { type: 'integer', example: 1 },
            period_year:  { type: 'integer', example: 2025 },
          },
        },
        AllocationRule: {
          type: 'object',
          properties: {
            id:                 { type: 'string' },
            allocation_type:    { type: 'string', enum: ['pribadi', 'keluarga', 'tabungan'] },
            percentage:         { type: 'number', example: 50 },
            target_category_id: { type: 'string', nullable: true },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id:             { type: 'string' },
            full_name:      { type: 'string', example: 'Ivano Wisnu' },
            monthly_income: { type: 'number', example: 5000000 },
            currency:       { type: 'string', example: 'IDR' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Pesan error' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Transactions', description: 'Catat & kelola transaksi keuangan' },
      { name: 'Dashboard',    description: 'Ringkasan, insight, dan progress budget' },
      { name: 'Allocations',  description: 'Aturan alokasi gaji & Mode Gajian' },
      { name: 'Categories',   description: 'Kelola kategori transaksi' },
{ name: 'Budgets',      description: 'Set & pantau limit pengeluaran' },
      { name: 'Profiles',     description: 'Data profil user' },
      { name: 'Balance',      description: 'Kelola saldo dan pemasukan saldo (top-up)' },
    ],
    paths: {
      '/api/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'List transaksi bulan ini',
          parameters: [
            { in: 'query', name: 'month', schema: { type: 'integer' }, example: 1 },
            { in: 'query', name: 'year',  schema: { type: 'integer' }, example: 2025 },
            { in: 'query', name: 'type',  schema: { type: 'string', enum: ['income','expense'] } },
            { in: 'query', name: 'allocation_type', schema: { type: 'string', enum: ['pribadi','keluarga','tabungan'] } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } } } } } },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Transactions'],
          summary: 'Tambah transaksi',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'allocation_type', 'amount'],
                  properties: {
                    type:             { type: 'string', enum: ['income','expense'] },
                    allocation_type:  { type: 'string', enum: ['pribadi','keluarga','tabungan'] },
                    amount:           { type: 'number', example: 50000 },
                    category_id:      { type: 'string' },
                    context_note:     { type: 'string', example: 'Bayar obat Bapak' },
                    transaction_date: { type: 'string', format: 'date', example: '2025-01-15' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Transaction' } } } } } },
            400: { description: 'Bad Request' },
          },
        },
      },
      '/api/transactions/bulk': {
        post: {
          tags: ['Transactions'],
          summary: 'Mode Gajian — split & simpan otomatis',
          description: 'Insert pemasukan gaji + semua alokasi sekaligus berdasarkan aturan alokasi yang sudah diset.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['salary_amount'],
                  properties: {
                    salary_amount:    { type: 'number', example: 5000000 },
                    transaction_date: { type: 'string', format: 'date', example: '2025-01-01' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created — semua transaksi berhasil disimpan' },
            400: { description: 'Aturan alokasi belum diset' },
          },
        },
      },
      '/api/transactions/{id}': {
        put: {
          tags: ['Transactions'],
          summary: 'Edit transaksi',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type:             { type: 'string', enum: ['income','expense'] },
                    allocation_type:  { type: 'string', enum: ['pribadi','keluarga','tabungan'] },
                    amount:           { type: 'number' },
                    category_id:      { type: 'string' },
                    context_note:     { type: 'string' },
                    transaction_date: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
        delete: {
          tags: ['Transactions'],
          summary: 'Hapus transaksi',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
      },
      '/api/dashboard/summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Ringkasan keuangan bulan ini',
          description: 'Total income, expense, saldo, breakdown per alokasi, dan breakdown per kategori untuk pie chart.',
          parameters: [
            { in: 'query', name: 'month', schema: { type: 'integer' } },
            { in: 'query', name: 'year',  schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/dashboard/insight': {
        get: {
          tags: ['Dashboard'],
          summary: 'Insight bulan ini vs bulan lalu',
          description: 'Perbandingan pengeluaran per tipe alokasi. Menghasilkan pesan otomatis seperti "Pengeluaran keluarga naik 20%".',
          parameters: [
            { in: 'query', name: 'month', schema: { type: 'integer' } },
            { in: 'query', name: 'year',  schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/dashboard/budgets': {
        get: {
          tags: ['Dashboard'],
          summary: 'Progress budget per kategori',
          description: 'List semua budget bulan ini beserta jumlah yang sudah dipakai, sisa, dan persentase.',
          parameters: [
            { in: 'query', name: 'month', schema: { type: 'integer' } },
            { in: 'query', name: 'year',  schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/allocations': {
        get: {
          tags: ['Allocations'],
          summary: 'Ambil aturan alokasi gaji',
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Allocations'],
          summary: 'Simpan aturan alokasi (upsert semua 3 tipe)',
          description: 'Total persentase ketiga tipe harus = 100.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rules: {
                      type: 'array',
                      example: [
                        { allocation_type: 'pribadi',  percentage: 50 },
                        { allocation_type: 'keluarga', percentage: 30 },
                        { allocation_type: 'tabungan', percentage: 20 },
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' }, 400: { description: 'Total tidak 100%' } },
        },
      },
      '/api/allocations/preview': {
        post: {
          tags: ['Allocations'],
          summary: 'Preview split gaji tanpa simpan',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['salary_amount'],
                  properties: {
                    salary_amount: { type: 'number', example: 5000000 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Preview berhasil' }, 400: { description: 'Aturan alokasi belum diset' } },
        },
      },
      '/api/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List semua kategori milik user',
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Categories'],
          summary: 'Tambah kategori baru',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'allocation_type'],
                  properties: {
                    name:            { type: 'string', example: 'Kopi' },
                    allocation_type: { type: 'string', enum: ['pribadi','keluarga','tabungan'] },
                    color:           { type: 'string', example: '#f97316' },
                    icon:            { type: 'string', example: 'coffee' },
                    is_salary:       { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/categories/{id}': {
        put: {
          tags: ['Categories'],
          summary: 'Edit kategori',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name:  { type: 'string' },
                    color: { type: 'string' },
                    icon:  { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
        delete: {
          tags: ['Categories'],
          summary: 'Hapus kategori',
          description: 'Kategori default tidak bisa dihapus.',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found atau kategori default' } },
        },
      },
      '/api/budgets': {
        get: {
          tags: ['Budgets'],
          summary: 'List budget bulan ini',
          parameters: [
            { in: 'query', name: 'month', schema: { type: 'integer' } },
            { in: 'query', name: 'year',  schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          tags: ['Budgets'],
          summary: 'Set budget baru',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['category_id', 'limit_amount'],
                  properties: {
                    category_id:  { type: 'string' },
                    limit_amount: { type: 'number', example: 500000 },
                    period_month: { type: 'integer', example: 1 },
                    period_year:  { type: 'integer', example: 2025 },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
      '/api/budgets/{id}': {
        put: {
          tags: ['Budgets'],
          summary: 'Update limit budget',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { limit_amount: { type: 'number' } } },
              },
            },
          },
          responses: { 200: { description: 'OK' } },
        },
        delete: {
          tags: ['Budgets'],
          summary: 'Hapus budget',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/profiles/me': {
        get: {
          tags: ['Profiles'],
          summary: 'Ambil profil user yang sedang login',
          responses: { 200: { description: 'OK' }, 404: { description: 'Profil belum dibuat' } },
        },
        put: {
          tags: ['Profiles'],
          summary: 'Update profil',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    full_name:      { type: 'string' },
                    monthly_income: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/profiles': {
        post: {
          tags: ['Profiles'],
          summary: 'Buat profil (setelah register)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['full_name'],
                  properties: {
                    full_name:      { type: 'string' },
                    monthly_income: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Created' } },
        },
      },
'/api/balance': {
        get: {
          tags: ['Balance'],
          summary: 'Ambil saldo saat ini',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object', properties: { balance: { type: 'string', example: '0' } } } } } } } },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Balance'],
          summary: 'Pemasukan saldo (top-up)',
          description: 'Menambahkan jumlah ke saldo yang sudah ada, lalu menyimpan hasilnya ke Supabase.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', example: 500000 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created — saldo berhasil ditambahkan' },
            400: { description: 'amount tidak valid' },
            404: { description: 'Profil tidak ditemukan' },
          },
        },
        put: {
          tags: ['Balance'],
          summary: 'Set saldo absolut (ganti nilai)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number', example: 500000 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'OK' },
            400: { description: 'amount tidak valid' },
          },
        },
      },
      '/api/health': {
        get: {
          tags: [],
          summary: 'Health check',
          security: [],
          responses: { 200: { description: 'Server running' } },
        },
      },
    },
  },
  apis: [],
}

export default swaggerJsdoc(options)