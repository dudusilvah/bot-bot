require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

/* ================= CONFIG ================= */
const STAFF_CHANNEL_ID = "1501578418834112554";
const LOG_CHANNEL_ID = "1501628297056882820";
const RESULT_CHANNEL_ID = "1501590299003064362";
const ROLE_ID = "1501576591145173184";
const REGISTER_CHANNEL_ID = "1501579466445422652";
const CATEGORY_ID = "1501579361453871255";
/* ========================================== */

const registros = new Map();

const perguntas = [
  "Digite seu **ID/Passaporte**\nExemplo: `937`\n(Apenas números)",

  "Digite seu **Telefone**\nExemplo: `333-333`",

  "Já participou de alguma facção antes?",

  "Quantas facções já participou?",

  "Quem te recrutou?"
];

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Criar painel
  if (message.content === "!painel") {
    if (message.channel.id !== REGISTER_CHANNEL_ID) {
      return message.reply(
        "Use esse comando apenas no canal de registro."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Registro Facção")
      .setDescription(
        "Clique no botão abaixo para iniciar seu registro."
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar Registro")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({
      embeds: [embed],
      components: [row]
    });
  }

  // Sistema de respostas
  const registro = registros.get(message.author.id);

  if (registro && message.channel.id === registro.canalId) {
    // validar ID
    if (registro.etapa === 0 && !/^\d+$/.test(message.content)) {
      return message.channel.send(
        "❌ Apenas números.\nExemplo: `937`"
      );
    }

    // validar telefone
    if (
      registro.etapa === 1 &&
      !/^\d{3}-\d{3}$/.test(message.content)
    ) {
      return message.channel.send(
        "❌ Formato inválido.\nUse: `333-333`"
      );
    }

    registro.respostas.push(message.content);
    registro.etapa++;

    if (registro.etapa < perguntas.length) {
      return message.channel.send(
        perguntas[registro.etapa]
      );
    }

    registros.delete(message.author.id);

    const guild = message.guild;
    const staffChannel =
      guild.channels.cache.get(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📨 Novo Registro")
      .setColor("Yellow")
      .addFields(
        { name: "Usuário", value: message.author.tag },
        { name: "ID", value: registro.respostas[0] },
        { name: "Telefone", value: registro.respostas[1] },
        { name: "Participou de facção", value: registro.respostas[2] },
        { name: "Quantas facções", value: registro.respostas[3] },
        { name: "Recrutador", value: registro.respostas[4] }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${message.author.id}`)
        .setLabel("✅ Aprovar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`recusar_${message.author.id}`)
        .setLabel("❌ Recusar")
        .setStyle(ButtonStyle.Danger)
    );

    await staffChannel.send({
      embeds: [embed],
      components: [row]
    });

    await message.channel.send(
      "✅ Registro enviado para staff.\nCanal será apagado em 10 segundos."
    );

    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 10000);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Criar canal temporário
  if (interaction.customId === "iniciar_registro") {
    const guild = interaction.guild;

    const canal = await guild.channels.create({
      name: `registro-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    registros.set(interaction.user.id, {
      etapa: 0,
      respostas: [],
      canalId: canal.id
    });

    await interaction.reply({
      content: `✅ Canal criado: ${canal}`,
      flags: 64
    });

    await canal.send(
      `${interaction.user}\nBem-vindo ao registro.\n\n${perguntas[0]}`
    );
  }

  // Aprovar
  if (interaction.customId.startsWith("aprovar_")) {
    try {
      const userId = interaction.customId.split("_")[1];
      const member =
        await interaction.guild.members.fetch(userId);

      await member.roles.add(ROLE_ID);
      await member.setNickname(
        `[FAC] ${member.user.username}`
      );

      const resultChannel =
        interaction.guild.channels.cache.get(
          RESULT_CHANNEL_ID
        );

      await resultChannel.send(
        `✅ **APROVADO**\nUsuário: ${member}\nStatus: Aprovado na facção`
      );

      const logChannel =
        interaction.guild.channels.cache.get(
          LOG_CHANNEL_ID
        );

      await logChannel.send(
        `📋 ${member.user.tag} aprovado por ${interaction.user.tag} em ${new Date().toLocaleString()}`
      );

      await interaction.reply({
        content: "✅ Usuário aprovado.",
        flags: 64
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content:
          "❌ Erro ao aprovar. Verifique permissões e posição do cargo.",
        flags: 64
      });
    }
  }

  // Recusar
  if (interaction.customId.startsWith("recusar_")) {
    const userId = interaction.customId.split("_")[1];
    const member =
      await interaction.guild.members.fetch(userId);

    const resultChannel =
      interaction.guild.channels.cache.get(
        RESULT_CHANNEL_ID
      );

    await resultChannel.send(
      `❌ **RECUSADO**\nUsuário: ${member}\nStatus: Registro recusado`
    );

    const logChannel =
      interaction.guild.channels.cache.get(
        LOG_CHANNEL_ID
      );

    await logChannel.send(
      `📋 ${member.user.tag} recusado por ${interaction.user.tag} em ${new Date().toLocaleString()}`
    );

    await interaction.reply({
      content: "❌ Usuário recusado.",
      flags: 64
    });
  }
});

client.login(process.env.TOKEN);