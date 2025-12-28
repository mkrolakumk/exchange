from aws_cdk import Stack, Duration, aws_rds as rds, aws_ec2 as ec2, aws_secretsmanager as secretsmanager, RemovalPolicy
from constructs import Construct


class DatabaseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, db_security_group: ec2.SecurityGroup, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.db_secret = secretsmanager.Secret(
            self, "DBSecret",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"username":"postgres"}',
                generate_string_key="password",
                exclude_punctuation=True,
                password_length=32
            )
        )

        self.database = rds.DatabaseInstance(
            self, "DB",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
            security_groups=[db_security_group],
            database_name="postgres",
            credentials=rds.Credentials.from_secret(self.db_secret),
            allocated_storage=20,
            max_allocated_storage=100,
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY,
            backup_retention=Duration.days(7),
            preferred_backup_window="03:00-04:00",
            publicly_accessible=False,
        )
