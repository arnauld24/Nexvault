package Digital.Cloud.Wallet.Service.System.repositories;

import Digital.Cloud.Wallet.Service.System.models.wallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface  WalletRepository extends JpaRepository<wallet, UUID>{
    Optional<wallet> findByUserId(UUID userId);
}

//public class WalletRepository {
//}
//
