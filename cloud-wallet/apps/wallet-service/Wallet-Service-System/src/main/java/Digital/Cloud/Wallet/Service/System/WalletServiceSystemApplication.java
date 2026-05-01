package Digital.Cloud.Wallet.Service.System;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import Digital.Cloud.Wallet.Service.System.repositories.WalletRepository;
import Digital.Cloud.Wallet.Service.System.models.wallet;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.Map;


@Service
@SpringBootApplication
public class WalletServiceSystemApplication {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    /**
     * General Transaction Processor (Deposit/Withdrawal)
     * Maps to the processTransaction call in your Controller
     */
    @Transactional
    public void processTransaction(UUID userId, BigDecimal amount, String type, String category) {
        // 1. Get Wallet ID from User ID (Required by schema.sql functions)
        wallet Wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));

        // 2. Generate a new Transaction ID
        UUID transactionId = UUID.randomUUID();

        // 3. Create the initial transaction record (as required by process_transaction logic)
        // Note: Your schema.sql expects a transaction record to exist before calling process_transaction
        String reference = "TXN-" + System.currentTimeMillis();
        entityManager.createNativeQuery(
                        "INSERT INTO transactions (id, reference, type, category, amount, net_amount, wallet_id, status) " +
                                "VALUES (:id, :ref, :type, :cat, :amt, :amt, :w_id, 'processing')")
                .setParameter("id", transactionId)
                .setParameter("ref", reference)
                .setParameter("type", type)
                .setParameter("cat", category)
                .setParameter("amt", amount)
                .setParameter("w_id", Wallet.getId())
                .executeUpdate();

        // 4. Call the PL/pgSQL function to update balances and log the result
        entityManager.createNativeQuery("SELECT process_transaction(:t_id, :w_id, :amt, 0, :type)")
                .setParameter("t_id", transactionId)
                .setParameter("w_id", Wallet.getId())
                .setParameter("amt", amount)
                .setParameter("type", type)
                .getSingleResult();

        // 5. Notify RabbitMQ
        sendNotification(userId, type, amount, category);
    }

    /**
     * Peer-to-Peer Transfer Implementation
     */
    @Transactional
    public void executeTransfer(UUID senderUserId, UUID recipientUserId, BigDecimal amount) {
        // Debit the sender
        processTransaction(senderUserId, amount, "debit", "transfer");

        // Credit the recipient
        processTransaction(recipientUserId, amount, "credit", "transfer");
    }

    /**
     * Helper to send messages to the Notification Service
     */
    private void sendNotification(UUID userId, String type, BigDecimal amount, String category) {
        Map<String, Object> notification = Map.of(
                "userId", userId,
                "type", type,
                "amount", amount,
                "category", category,
                "timestamp", System.currentTimeMillis()
        );
        rabbitTemplate.convertAndSend("nexvault.notifications", "notification.key", notification);
    }

    public static void main(String[] args) {
        SpringApplication.run(WalletServiceSystemApplication.class, args);
    }

} 
