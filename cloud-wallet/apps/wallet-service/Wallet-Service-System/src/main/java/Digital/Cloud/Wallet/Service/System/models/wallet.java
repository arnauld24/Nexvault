package Digital.Cloud.Wallet.Service.System.models;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;


@Entity
@Table(name="wallets")
@Data

public class wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", unique = true , nullable =false)
    private UUID userId;

    private BigDecimal balance = BigDecimal.ZERO;
    private String currency = "XAF";
    private String status = "active";

    @Version
    private Integer version;

    @Column(name = "created_at", updatable = false )
    private LocalDateTime createdAt = LocalDateTime.now();
}
