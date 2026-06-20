import React, { useState } from 'react';
import styles from './RegisterCompany.module.css';

export default function RegisterCompany() {
	const [isProcessing, setIsProcessing] = useState(false);
	const [acceptTerms, setAcceptTerms] = useState(false);
	const [companyData, setCompanyData] = useState({
		companyName: '',
		companyEmail: '',
		brandType: 'primary',
		phone: '',
		document: '',
		logo: null,
		street: '',
		number: '',
		neighborhood: '',
		city: '',
		state: '',
		cep: '',
	});
	const [adminData, setAdminData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
	});

	function handleCompanyChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
		const target = e.target;
		const { name, value } = target;
		const files = target instanceof HTMLInputElement ? target.files : null;
		setCompanyData((prev) => ({
			...prev,
			[name]: files ? files[0] : value,
		}));
	}

	function handleAdminChange(e: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setAdminData((prev) => ({ ...prev, [name]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setIsProcessing(true);
		setTimeout(() => setIsProcessing(false), 2000);
	}

	return (
		<div className={styles.bg}>
			<header className={styles.header}>
				<div className={styles.logoArea}>
					<img src="/logo.svg" alt="NexusFlow" className={styles.logo} />
					<span className={styles.logoText}>NexusFlow</span>
				</div>
				<div className={styles.loginArea}>
					<span>Já tem uma conta?</span>
					<a href="#" className={styles.loginBtn}>Entrar</a>
				</div>
			</header>
			<main className={styles.main}>
				<form className={styles.form} onSubmit={handleSubmit}>
					<h1 className={styles.title}>Crie seu espaço de trabalho</h1>
					<p className={styles.subtitle}>Preencha os detalhes abaixo para configurar sua empresa e conta de administrador.</p>
					<section className={styles.section}>
						<div className={styles.sectionTitle}><span>1</span> Configuração da Empresa</div>
						<div className={styles.grid2}>
							<div>
								<label>Nome da Empresa</label>
								<input name="companyName" placeholder="ex: Acme Corporation" value={companyData.companyName} onChange={handleCompanyChange} required />
							</div>
							<div>
								<label>E-mail Empresarial</label>
								<input name="companyEmail" placeholder="admin@company.com" value={companyData.companyEmail} onChange={handleCompanyChange} required />
							</div>
						</div>
						<div className={styles.grid2}>
							<div className={styles.brandTypeArea}>
								<label>Identidade da Marca</label>
								<div className={styles.brandTypeBtns}>
									<label>
										<input type="radio" name="brandType" value="primary" checked={companyData.brandType === 'primary'} onChange={handleCompanyChange} />
										<span>Cor Primária</span>
									</label>
									<label>
										<input type="radio" name="brandType" value="secondary" checked={companyData.brandType === 'secondary'} onChange={handleCompanyChange} />
										<span>Secundária</span>
									</label>
								</div>
							</div>
							<div>
								<label>Telefone</label>
								<input name="phone" placeholder="+1 (555) 000-0000" value={companyData.phone} onChange={handleCompanyChange} />
							</div>
						</div>
						<div className={styles.grid2}>
							<div>
								<label>CNPJ / CPF</label>
								<input name="document" placeholder="00.000.000/0000-00" value={companyData.document} onChange={handleCompanyChange} className={styles.inputError} />
								<span className={styles.errorMsg}>Por favor, insira um número de documento válido</span>
							</div>
							<div>
								<label>Logo da Empresa</label>
								<div className={styles.logoDropArea}>
									<input type="file" name="logo" accept="image/png, image/jpeg, image/svg+xml" onChange={handleCompanyChange} className={styles.logoInput} />
									<div className={styles.logoDropText}>
										<span>Arraste e solte ou <a href="#">procure</a></span>
										<span className={styles.logoDropHint}>PNG, JPG ou SVG (máx. 2MB)</span>
									</div>
								</div>
							</div>
						</div>
						<div className={styles.grid4}>
							<div>
								<label>Rua</label>
								<input name="street" placeholder="Nome da rua" value={companyData.street} onChange={handleCompanyChange} />
							</div>
							<div>
								<label>Número</label>
								<input name="number" placeholder="123" value={companyData.number} onChange={handleCompanyChange} />
							</div>
							<div>
								<label>Bairro</label>
								<input name="neighborhood" placeholder="Centro" value={companyData.neighborhood} onChange={handleCompanyChange} />
							</div>
							<div>
								<label>Cidade</label>
								<input name="city" placeholder="São Paulo" value={companyData.city} onChange={handleCompanyChange} />
							</div>
							<div>
								<label>Estado</label>
								<input name="state" placeholder="SP" value={companyData.state} onChange={handleCompanyChange} />
							</div>
							<div>
								<label>CEP</label>
								<input name="cep" placeholder="00000-00" value={companyData.cep} onChange={handleCompanyChange} />
							</div>
						</div>
					</section>
					<section className={styles.section}>
						<div className={styles.sectionTitle}><span>2</span> Usuário Administrador</div>
						<div className={styles.grid2}>
							<div>
								<label>Nome Completo</label>
								<input name="name" placeholder="John Doe" value={adminData.name} onChange={handleAdminChange} required />
							</div>
							<div>
								<label>E-mail Pessoal</label>
								<input name="email" placeholder="john@example.com" value={adminData.email} onChange={handleAdminChange} required />
							</div>
						</div>
						<div className={styles.grid2}>
							<div>
								<label>Password</label>
								<input type="password" name="password" value={adminData.password} onChange={handleAdminChange} required />
							</div>
							<div>
								<label>Confirmar Senha</label>
								<input type="password" name="confirmPassword" value={adminData.confirmPassword} onChange={handleAdminChange} required />
							</div>
						</div>
					</section>
					<div className={styles.termsArea}>
						<label className={styles.termsLabel}>
							<input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} />
							Eu concordo com os <a href="#">Termos de Serviço</a> e <a href="#">Política de Privacidade</a>
						</label>
					</div>
					<div className={styles.actions}>
						{isProcessing ? (
							<button type="button" className={styles.processingBtn} disabled>Processando...</button>
						) : (
							<button type="submit" className={styles.submitBtn} disabled={!acceptTerms}>Criar Conta</button>
						)}
					</div>
				</form>
			</main>
			<footer className={styles.footer}>
				© 2024 NexusFlow Inc. Todos os direitos reservados.
			</footer>
		</div>
	);
}
