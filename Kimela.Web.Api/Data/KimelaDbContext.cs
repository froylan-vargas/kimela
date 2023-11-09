using Kimela.Web.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Kimela.Web.Api.Data
{
    public class KimelaDbContext : DbContext
    {
        public KimelaDbContext(DbContextOptions<KimelaDbContext> options) : base(options) { }

        public DbSet<Product> Products { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
